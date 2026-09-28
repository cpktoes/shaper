import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BLANK_CSV_COLUMNS, isPickable } from "@/lib/blanks/catalog";
import { parseCsv } from "@/lib/blanks/csv";
import { readSeedCatalog, SEED_CSV_DIR } from "@/lib/blanks/seed-files";
import presetBlanks from "@/lib/blanks/preset-blanks.generated.json";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import golden from "./__fixtures__/phase11-foil-golden.json";
import {
  DEFAULT_BLANK_CUT,
  type BlankRecord,
  type BlankStation,
  type FineTuneSurface,
  type FitSettings,
  type TipStyle,
} from "./blank";
import {
  BLANK_PLACEMENT_BUFFER_MM,
  blankStationOf,
  boardOnBlank,
  catalogueExtremes,
  clampPlacement,
  FIT_EPSILON_MM,
  FIT_SAMPLE_STEP_MM,
  fitAt,
  FLOOR_EPSILON_MM,
  floorCheck,
  judgeBlank,
  levelCurve,
  listBlanks,
  MIN_FOIL_THICKNESS_MM,
  nearestFit,
  nearestFittingPlacement,
  placementRange,
  prepareBlank,
  TIP_EASE_WINDOW_MM,
  tweakExceedsDeckSkin,
  type BlankListResult,
  type BlankVerdict,
  type BoardFitContext,
  type BoardOnBlank,
  type BoardOnBlankInput,
  type PreparedBlank,
} from "./blank-fit";
import { BOARD_LENGTH_RANGE_IN, DEFAULT_BOARD_SPEC, type OutlineSpec } from "./board";
import { buildBlankProfile } from "./board-profile";
import { FOIL_THICKNESS_RANGE_IN } from "./foil";
import { buildOutline, sampleOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
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

/**
 * A board with no tip or fine-tune influence — only the rocker is read in test (a). Bottom Tip
 * Style, so any tip thinning comes off the deck and the rocker under the board is the blank's own
 * everywhere, tips included (Phase 12 D-06).
 */
function plainBoard(blank: BlankRecord): BoardOnBlankInput {
  const centre = blank.stations.find((s) => s.label === "C")!.thicknessMm!;
  return {
    length: blank.lengthMm,
    centerThickness: centre,
    noseTip: mm(0),
    tailTip: mm(0),
    nose12Offset: mm(0),
    tail12Offset: mm(0),
    ...DEFAULT_BLANK_CUT,
    tipStyle: "bottom",
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
    // The out-of-the-box cut (Pin deck): a nose tip thicker than the blank's nose drops the bottom
    // below the blank's bottom there (Phase 12 D-09, D-16).
    const board: BoardOnBlankInput = {
      ...plainBoard(blank),
      ...DEFAULT_BLANK_CUT,
      centerThickness: inchesToMm(2.5),
      tailTip: inchesToMm(1 / 4),
      noseTip: inchesToMm(noseTipCsv + 1 / 16),
    };
    const onBlank = boardOnBlank(prepared, board, mm(0));
    const result = fitAt(onBlank, narrowerBy(onBlank, inchesToMm(2)), mm(board.length / 2), rulesWith(inchesToMm(1)));
    expect(result.fits).toBe(false);
    expect(result.worst.kind).toBe("thin");
    expect(board.length - result.worst.station).toBeLessThanOrEqual(inchesToMm(1));
    expect(result.worst.amount).toBeGreaterThan(0);
    // The centre itself fits: the board is thinner than the blank there.
    const centre = board.length / 2;
    expect(onBlank.thicknessAt(centre)).toBeLessThan(onBlank.blankThicknessAt(centre));
  });
});

/**
 * The per-placement fit rules with a given width margin and the default Planer Max Depth (the one
 * pass that must survive under the board's centre, D-15) — the settings exercised, not expected values.
 */
function rulesWith(widthMargin: Mm) {
  return { widthMargin, planerMaxDepth: toFitSettings(DEFAULT_FIT_DEFAULTS).planerMaxDepth };
}

/** A board outline `by` narrower than the blank under it at every station (half-width, ≥ 0). */
function narrowerBy(onBlank: BoardOnBlank, by: number) {
  return (s: Mm) => Math.max(0, (onBlank.blankWidthAt(s) - by) / 2);
}

/** The default tip settings (`DEFAULT_FIT_DEFAULTS`) and the out-of-the-box cut — inputs, not expected values. */
function defaultBoard(blank: BlankRecord, length: number, centre: number): BoardOnBlankInput {
  return {
    ...plainBoard(blank),
    ...DEFAULT_BLANK_CUT,
    length: mm(length),
    centerThickness: mm(centre),
    noseTip: DEFAULT_FIT_DEFAULTS.noseTipThickness,
    tailTip: DEFAULT_FIT_DEFAULTS.tailTipThickness,
  };
}

// ---------------------------------------------------------------------------------------------
// Phase 12: the board cut from its blank the way a planer does. Every blank below is read from the
// committed CSVs, Phase 11's numbers from the generated golden fixture, and every expected value
// is computed here from the functions under test and the settings being exercised.
// ---------------------------------------------------------------------------------------------

const PICKABLE = CATALOG.filter(isPickable);
const TIP_STYLES: TipStyle[] = ["pinDeck", "bottom"];
const SURFACES: FineTuneSurface[] = ["deck", "bottom"];

/** Every 1/4" from the tail tip to the nose tip, plus the nose tip itself. */
function quarterStations(length: number): number[] {
  const quarter = inchesToMm(1 / 4);
  const out: number[] = [];
  for (let s = 0; s <= length; s += quarter) out.push(s);
  out.push(length);
  return out;
}

/** A board 2" shorter than its blank, 2 1/2" centre, default tips, the out-of-the-box cut, then `cut`. */
function cutBoard(blank: BlankRecord, cut: Partial<BoardOnBlankInput> = {}): BoardOnBlankInput {
  return { ...defaultBoard(blank, blank.lengthMm - inchesToMm(2), inchesToMm(2.5)), ...cut };
}

/** The one-sided slope jump of `f` at `x`, with step `h`. */
function slopeJump(f: (s: number) => number, x: number, h: number): number {
  return Math.abs((f(x + h) - f(x)) / h - (f(x) - f(x - h)) / h);
}

describe("the phase's named geometry tests (R7)", () => {
  const W = TIP_EASE_WINDOW_MM;

  it("the board's deck sits exactly the deck skin below the blank's deck at every station, on every seeded blank", () => {
    const deckSkin = inchesToMm(1 / 8);
    let checked = 0;
    for (const record of PICKABLE) {
      const board = cutBoard(record, { deckSkin, tipStyle: "pinDeck", fineTuneSurface: "deck" });
      const profile = buildBlankProfile(prepareBlank(record), board, mm(0));
      for (const s of quarterStations(board.length)) {
        checked++;
        expect(profile.deckAt(mm(s)), `${record.vendor} ${record.name} @ ${s}`).toBeCloseTo(
          profile.blank!.deckAt(mm(s)) - deckSkin,
          9,
        );
      }
    }
    expect(checked).toBeGreaterThan(PICKABLE.length * 100);
  });

  it("the board's bottom sits exactly the centre gap above the blank's bottom at every station, so the rocker is the blank's own", () => {
    for (const record of PICKABLE) {
      const board = cutBoard(record, { tipStyle: "bottom", fineTuneSurface: "deck" });
      const onBlank = boardOnBlank(prepareBlank(record), board, mm(0));
      for (const s of quarterStations(board.length)) {
        expect(onBlank.bottomOffAt(s), `${record.vendor} ${record.name} @ ${s}`).toBeCloseTo(onBlank.centerGap, 9);
      }
    }
    // Phase 11's own rocker, recorded from tag v1.3 before this phase touched the maths.
    for (const entry of golden.cases) {
      const record = findBlank(entry.vendor, entry.name);
      const length = mm(entry.boardLengthMm);
      const onBlank = boardOnBlank(
        prepareBlank(record),
        {
          length,
          centerThickness: mm(entry.centerThicknessMm),
          noseTip: mm(entry.noseTipMm),
          tailTip: mm(entry.tailTipMm),
          nose12Offset: mm(0),
          tail12Offset: mm(0),
          deckSkin: inchesToMm(1 / 8),
          tipStyle: "bottom",
          fineTuneSurface: "deck",
        },
        mm(entry.placementMm),
      );
      for (const { key, station } of rockerStationPositions(length)) {
        expect(onBlank.rockerAt(station), `${entry.label} ${key}`).toBeCloseTo(entry.rockerMm[key], 9);
      }
    }
  });

  it("each 12\" station's thickness is the blank's thickness there less the skin and the gap", () => {
    for (const record of PICKABLE) {
      for (const tipStyle of TIP_STYLES) {
        const board = cutBoard(record, { tipStyle });
        const onBlank = boardOnBlank(prepareBlank(record), board, mm(0));
        const skin = board.deckSkin!;
        for (const station of [W, board.length - W]) {
          expect(onBlank.derivedThicknessAt(station), `${record.vendor} ${record.name} ${tipStyle}`).toBeCloseTo(
            onBlank.blankThicknessAt(station) - skin - onBlank.centerGap,
            9,
          );
        }
      }
    }
  });

  it("changing Tip Style or a tip thickness moves no number at or inside the 12\" stations", () => {
    const n = PICKABLE.length;
    const blanks = [
      findBlank(MARKO_VENDOR, M_REGULAR),
      PICKABLE[Math.floor(n / 4)],
      PICKABLE[Math.floor(n / 2)],
      PICKABLE[Math.floor((3 * n) / 4)],
    ];
    const tips = [
      { noseTip: inchesToMm(5 / 16), tailTip: inchesToMm(1 / 4) },
      { noseTip: inchesToMm(1 / 2), tailTip: inchesToMm(7 / 16) },
    ];
    for (const record of blanks) {
      const prepared = prepareBlank(record);
      for (const fineTuneSurface of SURFACES) {
        const base = cutBoard(record, {
          fineTuneSurface,
          nose12Offset: inchesToMm(1 / 16),
          tail12Offset: mm(-inchesToMm(1 / 16)),
        });
        const L = base.length;
        const stations: number[] = [W, L - W];
        for (let s: number = W; s <= L - W; s += inchesToMm(1 / 4)) stations.push(s);
        const read = (onBlank: BoardOnBlank) =>
          stations.map((s) => [onBlank.thicknessAt(s), onBlank.rockerAt(s), onBlank.deckOffAt(s), onBlank.bottomOffAt(s)]);
        const reference = read(boardOnBlank(prepared, { ...base, tipStyle: "pinDeck", ...tips[0] }, mm(0)));
        for (const tipStyle of TIP_STYLES) {
          for (const tip of tips) {
            const other = read(boardOnBlank(prepared, { ...base, tipStyle, ...tip }, mm(0)));
            other.forEach((values, i) => {
              values.forEach((value, j) => {
                expect(value, `${record.name} ${fineTuneSurface} ${tipStyle} @ ${stations[i]} [${j}]`).toBe(reference[i][j]);
              });
            });
          }
        }
      }
    }
  });

  it("the tip thinning joins each 12\" station with no kink", () => {
    const h = 1e-3;
    for (const record of PICKABLE) {
      const prepared = prepareBlank(record);
      for (const tipStyle of TIP_STYLES) {
        const board = cutBoard(record, { tipStyle });
        const profile = buildBlankProfile(prepared, board, mm(0));
        const onBlank = profile.blank!.onBlank;
        const view = profile.blank!;
        const where = `${record.vendor} ${record.name} ${tipStyle}`;
        for (const x of [W, board.length - W]) {
          expect(slopeJump(onBlank.thicknessAt, x, h), `${where} thickness @ ${x}`).toBeLessThanOrEqual(
            slopeJump(onBlank.blankThicknessAt, x, h) + 1e-5,
          );
          if (tipStyle === "pinDeck") {
            expect(slopeJump(onBlank.rockerAt, x, h), `${where} bottom @ ${x}`).toBeLessThanOrEqual(
              slopeJump((s) => view.bottomAt(mm(s)), x, h) + 1e-5,
            );
          } else {
            expect(slopeJump((s) => profile.deckAt(mm(s)), x, h), `${where} deck @ ${x}`).toBeLessThanOrEqual(
              slopeJump((s) => view.deckAt(mm(s)), x, h) + 1e-5,
            );
          }
        }
      }
    }
  });
});

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

describe("the board's foil, cut from the blank (D-05, D-09, D-13, D-16)", () => {
  const blank = findBlank(MARKO_VENDOR, M_REGULAR);
  const prepared = prepareBlank(blank);
  const L = inchesToMm(70);
  const centre = inchesToMm(2.5);
  const board = defaultBoard(blank, L, centre);
  const { min, max } = placementRange(blank.lengthMm, L);
  const W = TIP_EASE_WINDOW_MM;
  const outline = (onBlank: BoardOnBlank) => narrowerBy(onBlank, inchesToMm(2));

  it("puts both tips exactly on their settings and the centre on the target at every placement, under either Tip Style", () => {
    for (const tipStyle of TIP_STYLES) {
      for (const p of [min, mm(0), max]) {
        const onBlank = boardOnBlank(prepared, { ...board, tipStyle }, p);
        expect(onBlank.thicknessAt(0)).toBe(board.tailTip);
        expect(onBlank.thicknessAt(L)).toBe(board.noseTip);
        expect(Math.abs(onBlank.thicknessAt(L / 2) - centre)).toBeLessThanOrEqual(1e-9);
        // The centre gap is the blank under the board's centre less the skin and the target (D-03).
        expect(onBlank.centerGap).toBeCloseTo(onBlank.blankThicknessAt(L / 2) - board.deckSkin! - centre, 12);
      }
    }
  });

  it("takes the tip thinning off the bottom under Pin deck and off the deck under Bottom — the thickness is the same either way", () => {
    const pin = boardOnBlank(prepared, { ...board, tipStyle: "pinDeck" }, mm(0));
    const bottom = boardOnBlank(prepared, { ...board, tipStyle: "bottom" }, mm(0));
    for (const s of quarterStations(L)) {
      expect(pin.thicknessAt(s)).toBe(bottom.thicknessAt(s));
      expect(pin.deckOffAt(s)).toBeCloseTo(board.deckSkin!, 12);
      expect(pin.bottomOffAt(s)).toBeCloseTo(pin.centerGap + pin.tipThinningAt(s), 12);
      expect(bottom.bottomOffAt(s)).toBeCloseTo(bottom.centerGap, 12);
      expect(bottom.deckOffAt(s)).toBeCloseTo(board.deckSkin! + bottom.tipThinningAt(s), 12);
      expect(pin.rockerAt(s)).toBeCloseTo(bottom.rockerAt(s) + pin.tipThinningAt(s), 12);
    }
    // Each tip's thinning is the un-thinned thickness there less its setting (D-16).
    for (const [s, tip] of [
      [0, board.tailTip],
      [L, board.noseTip],
    ] as const) {
      expect(pin.tipThinningAt(s)).toBeCloseTo(pin.blankThicknessAt(s) - board.deckSkin! - pin.centerGap - tip, 9);
    }
    expect(pin.tipThinningAt(W)).toBe(0);
    expect(pin.tipThinningAt(L - W)).toBe(0);
  });

  it("never lets a tip window dig under both its tip setting and the parallel cut, now the Phase 11 guard is gone", () => {
    // Inside a tip window the ease runs between the parallel cut (the blank's thickness less the
    // skin and the gap) and the tip setting. With the Phase 11 never-below guard retired (D-16),
    // this pins what holds instead: the thickness is never under the lower of the two, and where
    // the parallel cut leaves at least the tip setting all through the window, never more than
    // 1/64" under the setting. Where the cut itself leaves less than the setting (a thin centre in a
    // long, thick blank — the foil running out, D-18's territory), the board follows the cut there
    // and only the tip itself is made as thick as set.
    const sixtyFourth = inchesToMm(1 / 64);
    const sixteenth = inchesToMm(1 / 16);
    let boards = 0;
    let cutBelowSetting = 0;
    let worstUnderBoth = -Infinity;
    let worstUnderSetting = 0;
    for (const record of PICKABLE) {
      const blankPrepared = prepareBlank(record);
      const length = mm(record.lengthMm - inchesToMm(2));
      const range = placementRange(record.lengthMm, length);
      for (const c of [2.25, 2.5, 2.75, 3].map(inchesToMm)) {
        if (blankPrepared.centerThicknessMm < c + inchesToMm(1 / 4)) continue;
        const input = defaultBoard(record, length, c);
        for (const p of [range.min, mm(0), range.max]) {
          boards++;
          const onBlank = boardOnBlank(blankPrepared, input, p);
          expect(onBlank.thicknessAt(0)).toBe(input.tailTip);
          expect(onBlank.thicknessAt(length)).toBe(input.noseTip);
          const parallel = (s: number) => onBlank.blankThicknessAt(s) - input.deckSkin! - onBlank.centerGap;
          for (const [tip, at] of [
            [input.tailTip, (d: number) => d],
            [input.noseTip, (d: number) => length - d],
          ] as const) {
            let cutKeepsSetting = true;
            let underSetting = 0;
            for (let d = 0; d <= W; d += sixteenth) {
              const s = at(d);
              const t = onBlank.thicknessAt(s);
              worstUnderBoth = Math.max(worstUnderBoth, Math.min(tip, parallel(s)) - t);
              underSetting = Math.max(underSetting, tip - t);
              if (parallel(s) < tip) cutKeepsSetting = false;
            }
            if (cutKeepsSetting) worstUnderSetting = Math.max(worstUnderSetting, underSetting);
            else cutBelowSetting++;
          }
        }
      }
    }
    expect(boards).toBeGreaterThan(PICKABLE.length);
    expect(cutBelowSetting).toBeGreaterThan(0);
    expect(worstUnderBoth).toBeLessThanOrEqual(1e-9);
    expect(worstUnderSetting).toBeLessThanOrEqual(sixtyFourth);
  });

  it("makes a tip thicker than the parallel foil there as thick as set: Pin deck drops the tip rocker, Bottom lifts the deck above the blank's and fails (D-16)", () => {
    const preset = BOARD_PRESETS.find((p) => p.id === "shortboard")!;
    const pick = (presetBlanks.picks as Record<string, { vendor: string; name: string; placementMm: number }>)[preset.id];
    const shortboardPrepared = prepareBlank(findBlank(pick.vendor, pick.name));
    const input: BoardOnBlankInput = {
      length: preset.outline.length,
      centerThickness: preset.foil.center,
      noseTip: preset.foil.noseTip,
      tailTip: preset.foil.tailTip,
      nose12Offset: mm(0),
      tail12Offset: mm(0),
      ...DEFAULT_BLANK_CUT,
    };
    const pin = boardOnBlank(shortboardPrepared, { ...input, tipStyle: "pinDeck" }, mm(pick.placementMm));
    const bottom = boardOnBlank(shortboardPrepared, { ...input, tipStyle: "bottom" }, mm(pick.placementMm));
    expect(pin.tipThinningAt(0)).toBeLessThan(0);
    expect(pin.thicknessAt(0)).toBe(input.tailTip);
    expect(pin.rockerAt(0)).toBeLessThan(bottom.rockerAt(0));
    expect(bottom.deckOffAt(0)).toBeCloseTo(input.deckSkin! + bottom.tipThinningAt(0), 12);
    expect(bottom.deckOffAt(0)).toBeLessThan(0);
    const result = fitAt(bottom, outline(bottom), mm(input.length / 2), rulesWith(inchesToMm(1)));
    expect(result.fits).toBe(false);
    expect(result.worst.kind).toBe("thin");
    expect(result.worst.station).toBeLessThanOrEqual(inchesToMm(1));
  });

  it("puts a Deck fine-tune on the deck alone: the 12\" station moves by the tweak and the bottom and rocker stay put (D-13)", () => {
    const offset = inchesToMm(1 / 16);
    for (const p of [min, mm(0), max]) {
      const plain = boardOnBlank(prepared, board, p);
      const tuned = boardOnBlank(prepared, { ...board, fineTuneSurface: "deck", nose12Offset: offset }, p);
      expect(tuned.thicknessAt(L - W)).toBeCloseTo(tuned.derivedThicknessAt(L - W) + offset, 9);
      expect(tuned.thicknessAt(0)).toBe(plain.thicknessAt(0));
      expect(tuned.thicknessAt(L)).toBe(plain.thicknessAt(L));
      expect(tuned.thicknessAt(L / 2)).toBe(plain.thicknessAt(L / 2));
      expect(tuned.thicknessAt(W)).toBe(plain.thicknessAt(W));
      expect(tuned.deckOffAt(L - W)).toBeCloseTo(board.deckSkin! - offset, 9);
      for (const s of quarterStations(L)) {
        expect(tuned.rockerAt(s)).toBe(plain.rockerAt(s));
        expect(tuned.bottomOffAt(s)).toBe(plain.bottomOffAt(s));
      }
    }
  });

  it("puts a Bottom fine-tune on the bottom alone: the deck stays put and the rocker re-levels on its own low point (D-13)", () => {
    const offset = inchesToMm(1 / 8);
    const plain = boardOnBlank(prepared, { ...board, fineTuneSurface: "bottom" }, mm(0));
    const tuned = boardOnBlank(prepared, { ...board, fineTuneSurface: "bottom", tail12Offset: offset }, mm(0));
    for (const s of quarterStations(L)) expect(tuned.deckOffAt(s)).toBe(plain.deckOffAt(s));
    expect(tuned.bottomOffAt(W)).toBeCloseTo(tuned.centerGap - offset, 9);
    expect(tuned.thicknessAt(W)).toBeCloseTo(tuned.derivedThicknessAt(W) + offset, 9);
    let lowest = Infinity;
    for (let s = 0; s <= L; s += inchesToMm(1 / 64)) lowest = Math.min(lowest, tuned.rockerAt(s));
    expect(lowest).toBeGreaterThanOrEqual(-1e-3);
    expect(lowest).toBeLessThanOrEqual(1e-3);
  });

  it("gives the identical board on either fine-tune surface when both tweaks are zero (D-13)", () => {
    for (const tipStyle of TIP_STYLES) {
      const deck = boardOnBlank(prepared, { ...board, tipStyle, fineTuneSurface: "deck" }, max);
      const bottom = boardOnBlank(prepared, { ...board, tipStyle, fineTuneSurface: "bottom" }, max);
      for (const s of quarterStations(L)) {
        expect(bottom.rockerAt(s)).toBe(deck.rockerAt(s));
        expect(bottom.thicknessAt(s)).toBe(deck.thicknessAt(s));
        expect(bottom.deckOffAt(s)).toBe(deck.deckOffAt(s));
        expect(bottom.bottomOffAt(s)).toBe(deck.bottomOffAt(s));
      }
    }
  });

  it("fails the fit where a Deck tweak lifts the deck above the blank's deck (D-09)", () => {
    const plain = boardOnBlank(prepared, board, mm(0));
    expect(fitAt(plain, outline(plain), mm(L / 2), rulesWith(inchesToMm(1))).fits).toBe(true);
    const tuned = boardOnBlank(
      prepared,
      { ...board, fineTuneSurface: "deck", nose12Offset: mm(board.deckSkin! + inchesToMm(1 / 16)) },
      mm(0),
    );
    expect(tuned.deckOffAt(L - W)).toBeLessThan(0);
    const result = fitAt(tuned, outline(tuned), mm(L / 2), rulesWith(inchesToMm(1)));
    expect(result.fits).toBe(false);
    expect(result.worst.kind).toBe("thin");
    expect(Math.abs(result.worst.station - (L - W))).toBeLessThanOrEqual(inchesToMm(1));
  });

  it("fails the fit where the blank is too thin under the board's centre for the target and the skin — the bottom drops below the blank's (D-09)", () => {
    const plain = boardOnBlank(prepared, board, mm(0));
    const tooThick = mm(plain.blankThicknessAt(L / 2) - board.deckSkin! + inchesToMm(1 / 16));
    const onBlank = boardOnBlank(prepared, { ...board, centerThickness: tooThick }, mm(0));
    expect(onBlank.centerGap).toBeLessThan(0);
    for (const s of [W, L / 2, L - W]) expect(onBlank.bottomOffAt(s)).toBeLessThan(0);
    const result = fitAt(onBlank, outline(onBlank), mm(L / 2), rulesWith(inchesToMm(1)));
    expect(result.fits).toBe(false);
    expect(result.worst.kind).toBe("thin");
  });

  it("on realistic boards on every blank the list puts under FITS: never below zero, centre on target, tips on their settings", () => {
    const quarter = inchesToMm(1 / 4);
    const boards: { label: string; outline: OutlineSpec; length: Mm; tips: { noseTip: Mm; tailTip: Mm } }[] = [
      {
        label: "default",
        outline: DEFAULT_BOARD_SPEC.outline,
        length: DEFAULT_BOARD_SPEC.outline.length,
        tips: { noseTip: DEFAULT_FIT_DEFAULTS.noseTipThickness, tailTip: DEFAULT_FIT_DEFAULTS.tailTipThickness },
      },
      ...BOARD_PRESETS.map((preset) => ({
        label: preset.id,
        outline: preset.outline,
        length: preset.outline.length,
        tips: { noseTip: preset.foil.noseTip, tailTip: preset.foil.tailTip },
      })),
    ];
    let checked = 0;
    const problems: string[] = [];
    for (const { label, outline: spec, length, tips } of boards) {
      for (let c: number = inchesToMm(2); c <= inchesToMm(3) + 1e-9; c += quarter) {
        const ctx = fitContext(spec, length, mm(c), tips);
        for (const verdict of listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS).fits) {
          checked++;
          const onBlank = boardOnBlank(verdict.prepared, ctx.board, verdict.placement);
          const where = `${label} c=${c} ${keyOf(verdict.prepared.record)}`;
          if (Math.abs(onBlank.thicknessAt(length / 2) - c) > 1e-9) problems.push(`${where}: centre`);
          if (onBlank.thicknessAt(0) !== tips.tailTip) problems.push(`${where}: tail tip`);
          if (onBlank.thicknessAt(length) !== tips.noseTip) problems.push(`${where}: nose tip`);
          for (const s of quarterStations(length)) {
            if (onBlank.thicknessAt(s) < 0) problems.push(`${where}: below zero at ${s}`);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(problems).toEqual([]);
    // A whole-catalogue sweep, several lists deep: its own time limit, so a busy machine can't fail
    // it — the speed guard is "judges the whole catalogue for the default board in under 250 ms".
  }, 30_000);
});

describe("the fit check (R12, D-05)", () => {
  const blank = findBlank(MARKO_VENDOR, M_REGULAR);
  const prepared = prepareBlank(blank);
  const L = blank.lengthMm;
  const margin = inchesToMm(1);

  it("passes the M-Regular at full length with default tips and an outline 2\" narrower everywhere", () => {
    const onBlank = boardOnBlank(prepared, defaultBoard(blank, L, inchesToMm(2.5)), mm(0));
    const result = fitAt(onBlank, narrowerBy(onBlank, inchesToMm(2)), mm(L / 2), rulesWith(margin));
    expect(result.fits).toBe(true);
    expect(result.worst.amount).toBeLessThanOrEqual(0);
  });

  it("fails wide by the missing clearance where the board is only 1/2\" narrower than the blank", () => {
    const onBlank = boardOnBlank(prepared, defaultBoard(blank, L, inchesToMm(2.5)), mm(0));
    const tight = L / 2;
    const narrow = narrowerBy(onBlank, inchesToMm(2));
    const halfWidthAt = (s: Mm) => (s === tight ? onBlank.blankWidthAt(s) / 2 - inchesToMm(1 / 4) : narrow(s));
    const result = fitAt(onBlank, halfWidthAt, mm(tight), rulesWith(margin));
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
    const result = fitAt(onBlank, narrowerBy(onBlank, inchesToMm(2)), mm(Lr / 2), rulesWith(margin));
    expect(result.fits).toBe(true);
  });

  it("fails a board longer than its blank, where there is no foam at all (Pitfall 8)", () => {
    const longer = mm(L + inchesToMm(2));
    const onBlank = boardOnBlank(prepared, defaultBoard(blank, longer, inchesToMm(2.5)), mm(0));
    expect(onBlank.blankThicknessAt(0)).toBe(0);
    expect(onBlank.blankWidthAt(longer)).toBe(0);
    const result = fitAt(onBlank, narrowerBy(onBlank, inchesToMm(2)), mm(longer / 2), rulesWith(margin));
    expect(result.fits).toBe(false);
    expect(result.worst.kind).toBe("thin");
  });

  it("samples every quarter inch", () => {
    expect(FIT_SAMPLE_STEP_MM).toBe(inchesToMm(1 / 4));
    expect(BLANK_PLACEMENT_BUFFER_MM).toBe(inchesToMm(1 / 2));
  });
});

// ---------------------------------------------------------------------------------------------
// Judging the catalogue (11-03). Every length and thickness below is read from a catalogue record
// or computed from the settings; blank names appear only to FIND the two blanks the SPEC names.
// ---------------------------------------------------------------------------------------------

/** Every blank the maths can prepare — pickable or not — so the pickable filter is really tested. */
const PREPARED_ALL: PreparedBlank[] = CATALOG.flatMap((blank) => {
  try {
    return [prepareBlank(blank)];
  } catch {
    return [];
  }
});

const DEFAULT_SETTINGS: FitSettings = toFitSettings(DEFAULT_FIT_DEFAULTS);
const SIXTEENTH_MM = inchesToMm(1 / 16);
const QUARTER_MM = inchesToMm(1 / 4);
/**
 * How much a blank's printed centre must stand above the target centre out of the box (Phase 12
 * D-10): the board's Deck Skin plus one pass of the Planer Max Depth — both read from the defaults.
 */
const DEFAULT_CENTRE_FLOOR = mm(DEFAULT_BLANK_CUT.deckSkin + DEFAULT_SETTINGS.planerMaxDepth);

/** The floor check's view of a board: its length, target centre and its own Deck Skin. */
function floorBoard(length: Mm, centerThickness: Mm, deckSkin: Mm = DEFAULT_BLANK_CUT.deckSkin) {
  return { length, centerThickness, deckSkin };
}

/** A board built from an outline at the given length and centre, with the given tips. */
function fitContext(
  outline: OutlineSpec,
  length: Mm,
  centre: Mm,
  tips: { noseTip: Mm; tailTip: Mm } = {
    noseTip: DEFAULT_FIT_DEFAULTS.noseTipThickness,
    tailTip: DEFAULT_FIT_DEFAULTS.tailTipThickness,
  },
): BoardFitContext {
  const geometry = buildOutline({ ...outline, length });
  return {
    board: {
      length,
      centerThickness: centre,
      noseTip: tips.noseTip,
      tailTip: tips.tailTip,
      nose12Offset: mm(0),
      tail12Offset: mm(0),
      ...DEFAULT_BLANK_CUT,
    },
    halfWidthAt: (s: Mm) => sampleOutline(geometry, s),
    widePointStation: geometry.widePointStation,
  };
}

/** The default outline at a given length and centre, default tips. */
function defaultContext(lengthIn: number, centreIn: number): BoardFitContext {
  return fitContext(DEFAULT_BOARD_SPEC.outline, inchesToMm(lengthIn), inchesToMm(centreIn));
}

/** The boards the property-style tests sweep: the default board at 72" and 70", and every preset. */
function sweepContexts(): { label: string; ctx: BoardFitContext }[] {
  return [
    { label: `default 72"`, ctx: defaultContext(72, 2.5) },
    { label: `default 70"`, ctx: defaultContext(70, 2.5) },
    ...BOARD_PRESETS.map((preset) => ({
      label: preset.id,
      ctx: fitContext(preset.outline, preset.outline.length, preset.foil.center, {
        noseTip: preset.foil.noseTip,
        tailTip: preset.foil.tailTip,
      }),
    })),
  ];
}

const keyOf = (record: Pick<BlankRecord, "vendor" | "name">) => `${record.vendor} ${record.name}`;
const listedKeys = (result: BlankListResult) =>
  [...result.fits, ...result.wontFit].map((verdict) => keyOf(verdict.prepared.record));

/** The fit check exactly as the list runs it, at one placement. */
function fitHere(prepared: PreparedBlank, ctx: BoardFitContext, settings: FitSettings, placement: number) {
  return fitAt(
    boardOnBlank(prepared, ctx.board, mm(placement)),
    ctx.halfWidthAt,
    ctx.widePointStation,
    settings,
  );
}

/** Every placement on the 1/16" grid (multiples of 1/16" from centre) inside the slider's range. */
function sixteenthGrid(prepared: PreparedBlank, boardLength: Mm): number[] {
  const { min, max } = placementRange(prepared.lengthMm, boardLength);
  const first = Math.ceil(min / SIXTEENTH_MM - 1e-9);
  const last = Math.floor(max / SIXTEENTH_MM + 1e-9);
  const grid: number[] = [];
  for (let i = first; i <= last; i++) grid.push(i * SIXTEENTH_MM);
  return grid;
}

describe("judging the catalogue (D-04, D-06, D-07)", () => {
  const mRegular = findBlank(MARKO_VENDOR, M_REGULAR);
  const arcticSb = findBlank("Arctic Foam", `5'8" SB`);

  it(`R2: a 5'10" board at 2 1/2" lists Marko 6'0" M-Regular, not Arctic 5'8" SB, and the settings move the floors`, () => {
    const ctx = defaultContext(70, 2.5);
    // The catalogue's own figures decide which side of the floor each blank lands — read, not typed.
    expect(mRegular.lengthMm).toBeGreaterThanOrEqual(ctx.board.length + DEFAULT_SETTINGS.extraLength);
    expect(arcticSb.lengthMm).toBeLessThan(ctx.board.length + DEFAULT_SETTINGS.extraLength);

    const listed = listedKeys(listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS));
    expect(listed).toContain(keyOf(mRegular));
    expect(listed).not.toContain(keyOf(arcticSb));

    const longer: FitSettings = {
      ...DEFAULT_SETTINGS,
      extraLength: mm(DEFAULT_SETTINGS.extraLength + inchesToMm(3)),
    };
    expect(listedKeys(listBlanks(PREPARED_ALL, ctx, longer))).not.toContain(keyOf(mRegular));

    // A planer pass deep enough that M-Regular's centre can't hold the skin and one pass any more.
    const mRegularCentre = prepareBlank(mRegular).centerThicknessMm;
    const thicker: FitSettings = {
      ...DEFAULT_SETTINGS,
      planerMaxDepth: mm(mRegularCentre - ctx.board.centerThickness - DEFAULT_BLANK_CUT.deckSkin + SIXTEENTH_MM),
    };
    expect(listedKeys(listBlanks(PREPARED_ALL, ctx, thicker))).not.toContain(keyOf(mRegular));
  });

  it("Pitfall 6: a board exactly Extra Length shorter than a blank lists it, even with float noise; a millimetre longer hides it", () => {
    const prepared = prepareBlank(mRegular);
    const boundary = prepared.lengthMm - DEFAULT_SETTINGS.extraLength;
    const centre = inchesToMm(2.5);
    for (const length of [boundary, boundary + 1e-9, boundary - 1e-9]) {
      const check = floorCheck(prepared, floorBoard(mm(length), centre), DEFAULT_SETTINGS);
      expect(check.passes).toBe(true);
      expect(check.lengthShortBy).toBeNull();
      const ctx = fitContext(DEFAULT_BOARD_SPEC.outline, mm(length), centre);
      expect(listedKeys(listBlanks([prepared], ctx, DEFAULT_SETTINGS))).toEqual([keyOf(mRegular)]);
    }
    const tooLong = floorCheck(prepared, floorBoard(mm(boundary + 1), centre), DEFAULT_SETTINGS);
    expect(tooLong.passes).toBe(false);
    expect(tooLong.lengthShortBy).toBeCloseTo(1, 9);
    const ctx = fitContext(DEFAULT_BOARD_SPEC.outline, mm(boundary + 1), centre);
    expect(listedKeys(listBlanks([prepared], ctx, DEFAULT_SETTINGS))).toEqual([]);

    // The centre floor, the same way: exactly on it passes, a millimetre over fails by that much.
    const centreBoundary = prepared.centerThicknessMm - DEFAULT_CENTRE_FLOOR;
    const onCentre = floorCheck(prepared, floorBoard(inchesToMm(60), mm(centreBoundary + 1e-9)), DEFAULT_SETTINGS);
    expect(onCentre.passes).toBe(true);
    expect(onCentre.centerShortBy).toBeNull();
    const overCentre = floorCheck(prepared, floorBoard(inchesToMm(60), mm(centreBoundary + 1)), DEFAULT_SETTINGS);
    expect(overCentre.passes).toBe(false);
    expect(overCentre.lengthShortBy).toBeNull();
    expect(overCentre.centerShortBy).toBeCloseTo(1, 9);
    expect(FLOOR_EPSILON_MM).toBe(1e-6);
  });

  it("floorCheck reports how short and how thin, and null for a floor that passes", () => {
    const prepared = prepareBlank(mRegular);
    const inch = inchesToMm(1);
    const eighth = inchesToMm(1 / 8);
    const length = mm(prepared.lengthMm - DEFAULT_SETTINGS.extraLength + inch);
    const centre = mm(prepared.centerThicknessMm - DEFAULT_CENTRE_FLOOR + eighth);
    const both = floorCheck(prepared, floorBoard(length, centre), DEFAULT_SETTINGS);
    expect(both.passes).toBe(false);
    expect(both.lengthShortBy).toBeCloseTo(inch, 9);
    expect(both.centerShortBy).toBeCloseTo(eighth, 9);
    const fine = floorCheck(prepared, floorBoard(inchesToMm(60), inchesToMm(2)), DEFAULT_SETTINGS);
    expect(fine).toEqual({ passes: true, lengthShortBy: null, centerShortBy: null });
  });

  it("D-10: out of the box the centre floor is the target + 1/4\" — the 1/8\" Deck Skin and one 1/8\" planer pass", () => {
    expect(DEFAULT_CENTRE_FLOOR).toBeCloseTo(inchesToMm(1 / 4), 9);
    // A blank thinner than centre + skin + one pass at its printed centre is hidden; exactly on it
    // is listed.
    const prepared = prepareBlank(mRegular);
    const onFloor = mm(prepared.centerThicknessMm - DEFAULT_CENTRE_FLOOR);
    const listed = (centre: Mm) =>
      listedKeys(listBlanks([prepared], fitContext(DEFAULT_BOARD_SPEC.outline, inchesToMm(70), centre), DEFAULT_SETTINGS));
    expect(listed(onFloor)).toEqual([keyOf(mRegular)]);
    expect(listed(mm(onFloor + SIXTEENTH_MM))).toEqual([]);
    const under = floorCheck(prepared, floorBoard(inchesToMm(70), mm(onFloor + SIXTEENTH_MM)), DEFAULT_SETTINGS);
    expect(under.passes).toBe(false);
    expect(under.lengthShortBy).toBeNull();
    expect(under.centerShortBy).toBeCloseTo(SIXTEENTH_MM, 9);
  });

  it("D-10: a thicker Deck Skin on the board raises the centre floor by exactly as much", () => {
    const prepared = prepareBlank(mRegular);
    const centre = mm(prepared.centerThicknessMm - DEFAULT_CENTRE_FLOOR);
    const thickerSkin = mm(DEFAULT_BLANK_CUT.deckSkin + SIXTEENTH_MM);
    expect(floorCheck(prepared, floorBoard(inchesToMm(70), centre), DEFAULT_SETTINGS).passes).toBe(true);
    const raised = floorCheck(prepared, floorBoard(inchesToMm(70), centre, thickerSkin), DEFAULT_SETTINGS);
    expect(raised.passes).toBe(false);
    expect(raised.centerShortBy).toBeCloseTo(SIXTEENTH_MM, 9);

    // The list reads the skin from the board it is handed: the same board with the thicker skin
    // hides M-Regular, and lists nothing the default skin does not.
    const ctx = fitContext(DEFAULT_BOARD_SPEC.outline, inchesToMm(70), centre);
    const thickCtx: BoardFitContext = { ...ctx, board: { ...ctx.board, deckSkin: thickerSkin } };
    const withDefault = listedKeys(listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS));
    const withThicker = listedKeys(listBlanks(PREPARED_ALL, thickCtx, DEFAULT_SETTINGS));
    expect(withDefault).toContain(keyOf(mRegular));
    expect(withThicker).not.toContain(keyOf(mRegular));
    for (const key of withThicker) expect(withDefault).toContain(key);
  });

  it("D-10: a deeper Planer Max Depth raises the centre floor by exactly as much", () => {
    const prepared = prepareBlank(mRegular);
    const centre = mm(prepared.centerThicknessMm - DEFAULT_CENTRE_FLOOR);
    const deeper: FitSettings = { ...DEFAULT_SETTINGS, planerMaxDepth: mm(DEFAULT_SETTINGS.planerMaxDepth + SIXTEENTH_MM) };
    const raised = floorCheck(prepared, floorBoard(inchesToMm(70), centre), deeper);
    expect(raised.passes).toBe(false);
    expect(raised.centerShortBy).toBeCloseTo(SIXTEENTH_MM, 9);
  });

  it("D-10: for the default board the list only grows against Phase 11's 3/8\" Extra Center Thickness rule", () => {
    // Phase 11's floor, restated here only to compare against: printed centre ≥ target + 3/8".
    const oldCentreFloor = inchesToMm(3 / 8);
    expect(DEFAULT_CENTRE_FLOOR).toBeLessThan(oldCentreFloor);
    let grewSomewhere = false;
    for (const centreIn of [2.25, 2.5, 2.75, 3]) {
      const ctx = defaultContext(72, centreIn);
      const listed = listedKeys(listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS));
      const oldListed = PREPARED_ALL.filter(
        (p) =>
          isPickable(p.record) &&
          p.lengthMm >= ctx.board.length + DEFAULT_SETTINGS.extraLength - FLOOR_EPSILON_MM &&
          p.centerThicknessMm >= ctx.board.centerThickness + oldCentreFloor - FLOOR_EPSILON_MM,
      ).map((p) => keyOf(p.record));
      for (const key of oldListed) expect(listed).toContain(key);
      if (listed.length > oldListed.length) grewSomewhere = true;
    }
    expect(grewSomewhere).toBe(true);
  });

  it("D-07: across the default board and every preset, each fitting verdict sits at the fitting 1/16\" placement closest to centre", () => {
    // No placement parameter at all, so a slider move cannot recompute a verdict (R14).
    expect(judgeBlank.length).toBe(3);
    expect(listBlanks.length).toBe(3);

    let checked = 0;
    for (const { ctx } of sweepContexts()) {
      const result = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
      for (const verdict of result.fits) {
        checked++;
        const p = verdict.placement;
        expect(fitHere(verdict.prepared, ctx, DEFAULT_SETTINGS, p).fits).toBe(true);
        if (Math.abs(p) < 1e-9) continue;
        // No 1/16" placement closer to centre, on either side, fits.
        for (const g of sixteenthGrid(verdict.prepared, ctx.board.length)) {
          if (Math.abs(g) < Math.abs(p) - 1e-9) {
            expect(fitHere(verdict.prepared, ctx, DEFAULT_SETTINGS, g).fits).toBe(false);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it(`D-07: the default 72" board at 2 1/2" — the 1/16" step nearer centre never fits`, () => {
    const ctx = defaultContext(72, 2.5);
    const result = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
    expect(result.fits.length).toBeGreaterThan(0);
    for (const verdict of result.fits) {
      const p = verdict.placement;
      if (Math.abs(p) < 1e-9) continue;
      const nearer = p - Math.sign(p) * SIXTEENTH_MM;
      expect(fitHere(verdict.prepared, ctx, DEFAULT_SETTINGS, nearer).fits).toBe(false);
    }
  });

  it("D-06: a WON'T FIT blank passed both floors and is judged at its nearly-fits placement", () => {
    let wontFit = 0;
    for (const { ctx } of sweepContexts()) {
      const result = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
      for (const verdict of result.wontFit) {
        wontFit++;
        const { prepared } = verdict;
        const L = ctx.board.length;
        expect(floorCheck(prepared, ctx.board, DEFAULT_SETTINGS).passes).toBe(true);
        expect(verdict.fits).toBe(false);
        expect(verdict.worst.amount).toBeGreaterThan(FIT_EPSILON_MM);
        expect(verdict.worst.station).toBeGreaterThanOrEqual(0);
        expect(verdict.worst.station).toBeLessThanOrEqual(L);
        const range = placementRange(prepared.lengthMm, L);
        expect(verdict.placement).toBeGreaterThanOrEqual(range.min);
        expect(verdict.placement).toBeLessThanOrEqual(range.max);
        // The reading is exactly the fit check at that placement...
        expect(fitHere(prepared, ctx, DEFAULT_SETTINGS, verdict.placement)).toEqual({
          fits: false,
          worst: verdict.worst,
        });
        // ...no quarter-inch placement fits, and none reads a smaller worst shortfall.
        for (const g of sixteenthGrid(prepared, L)) {
          if (Math.abs(Math.round(g / QUARTER_MM) * QUARTER_MM - g) > 1e-6) continue;
          const here = fitHere(prepared, ctx, DEFAULT_SETTINGS, g);
          expect(here.fits).toBe(false);
          expect(verdict.worst.amount).toBeLessThanOrEqual(here.worst.amount + 1e-9);
        }
      }
      for (const verdict of result.fits) {
        expect(verdict.fits).toBe(true);
        expect(verdict.worst.amount).toBeLessThanOrEqual(FIT_EPSILON_MM);
      }
    }
    expect(wontFit).toBeGreaterThan(0);
  });

  it("orders both groups by length, shortest first, ties by name", () => {
    const inOrder = (verdicts: readonly BlankVerdict[]) => {
      for (let i = 1; i < verdicts.length; i++) {
        const a = verdicts[i - 1].prepared;
        const b = verdicts[i].prepared;
        expect(a.lengthMm).toBeLessThanOrEqual(b.lengthMm);
        if (a.lengthMm === b.lengthMm) expect(a.record.name <= b.record.name).toBe(true);
      }
    };
    for (const { ctx } of sweepContexts()) {
      const result = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
      inOrder(result.fits);
      inOrder(result.wontFit);
    }
  });

  it("lists only pickable blanks, whatever it is handed", () => {
    const notPickable = CATALOG.filter((blank) => !isPickable(blank)).map(keyOf);
    expect(notPickable.length).toBeGreaterThan(0);
    for (const { ctx } of [{ ctx: defaultContext(60, 2) }, ...sweepContexts()]) {
      const result = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
      for (const key of listedKeys(result)) expect(notPickable).not.toContain(key);
      for (const verdict of [...result.fits, ...result.wontFit]) {
        expect(isPickable(verdict.prepared.record)).toBe(true);
      }
    }
  });

  it("judges the whole catalogue for the default board in under 250 ms", () => {
    const ctx = defaultContext(72, 2.5);
    const started = performance.now();
    const result = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
    const elapsed = performance.now() - started;
    expect(result.fits.length + result.wontFit.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(250);
  });

  it("judgeBlank reads the same verdict listBlanks does", () => {
    const ctx = defaultContext(70, 2.5);
    const result = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
    for (const verdict of [...result.wontFit, ...result.fits].slice(0, 20)) {
      expect(judgeBlank(verdict.prepared, ctx, DEFAULT_SETTINGS)).toEqual(verdict);
    }
  });

  it("catalogueExtremes reads the longest blank and the thickest centre over pickable blanks", () => {
    const pickable = PREPARED_ALL.filter((p) => isPickable(p.record));
    const extremes = catalogueExtremes(PREPARED_ALL);
    expect(extremes.longest).toBe(Math.max(...pickable.map((p) => p.lengthMm)));
    expect(extremes.thickestCenter).toBe(Math.max(...pickable.map((p) => p.centerThicknessMm)));
  });

  describe("an empty list says which floor emptied it", () => {
    const extremes = catalogueExtremes(PREPARED_ALL);

    it("null whenever something is listed", () => {
      expect(listBlanks(PREPARED_ALL, defaultContext(72, 2.5), DEFAULT_SETTINGS).emptyReason).toBeNull();
    });

    it("thickness — a centre above every blank's centre less the Deck Skin and one planer pass", () => {
      const centre = mm(extremes.thickestCenter - DEFAULT_CENTRE_FLOOR + SIXTEENTH_MM);
      const ctx = fitContext(DEFAULT_BOARD_SPEC.outline, inchesToMm(72), centre);
      const result = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
      expect(result.fits).toEqual([]);
      expect(result.wontFit).toEqual([]);
      expect(result.emptyReason).toBe("thickness");
    });

    it("length — a board longer than every blank less Extra Length", () => {
      const ctx = defaultContext(72, 2.5);
      const settings: FitSettings = {
        ...DEFAULT_SETTINGS,
        extraLength: mm(extremes.longest - ctx.board.length + inchesToMm(1)),
      };
      const result = listBlanks(PREPARED_ALL, ctx, settings);
      expect(result.fits).toEqual([]);
      expect(result.wontFit).toEqual([]);
      expect(result.emptyReason).toBe("length");
    });

    it("both — each floor alone leaves blanks, but no blank passes both", () => {
      // The catalogue's longest blank is also among its thickest, so "both" needs a pair of real
      // blanks where the longer one is the thinner: floors set so only the long one is long enough
      // and only the thick one is thick enough.
      const ctx = defaultContext(72, 2.5);
      const pickable = PREPARED_ALL.filter((p) => isPickable(p.record));
      let pair: [PreparedBlank, PreparedBlank] | null = null;
      for (const long of pickable) {
        const thick = pickable.find(
          (p) => p.lengthMm < long.lengthMm && p.centerThicknessMm > long.centerThicknessMm,
        );
        if (thick) {
          pair = [long, thick];
          break;
        }
      }
      expect(pair).not.toBeNull();
      const [long, thick] = pair!;
      const settings: FitSettings = {
        ...DEFAULT_SETTINGS,
        extraLength: mm(long.lengthMm - ctx.board.length),
        planerMaxDepth: mm(thick.centerThicknessMm - ctx.board.centerThickness - DEFAULT_BLANK_CUT.deckSkin),
      };
      const result = listBlanks([long, thick], ctx, settings);
      expect(result.fits).toEqual([]);
      expect(result.wontFit).toEqual([]);
      expect(result.emptyReason).toBe("both");
    });
  });
});

describe("the offer and the rescue (D-08, R6)", () => {
  /** The offer's properties (Pitfall 12): fits, is not the current blank, and nothing is closer. */
  function expectClosestOffer(
    offer: BlankVerdict,
    current: Pick<BlankRecord, "vendor" | "name" | "lengthMm">,
    fits: readonly BlankVerdict[],
    target: Mm,
  ) {
    expect(offer.fits).toBe(true);
    expect(keyOf(offer.prepared.record)).not.toBe(keyOf(current));
    const gap = Math.abs(offer.prepared.lengthMm - current.lengthMm);
    const spare = offer.prepared.centerThicknessMm - target;
    for (const other of fits) {
      if (keyOf(other.prepared.record) === keyOf(current)) continue;
      const otherGap = Math.abs(other.prepared.lengthMm - current.lengthMm);
      expect(otherGap).toBeGreaterThanOrEqual(gap - 1e-9);
      // Same length gap: the offer leaves no more spare foam at the centre.
      if (Math.abs(otherGap - gap) <= 1e-9) {
        expect(spare).toBeLessThanOrEqual(other.prepared.centerThicknessMm - target + 1e-9);
      }
    }
  }

  it("R6: M-Regular stops passing the centre floor, and the offer is the closest-length blank that fits", () => {
    const mRegular = findBlank(MARKO_VENDOR, M_REGULAR);
    const prepared = prepareBlank(mRegular);
    const before = defaultContext(70, 2.5);
    expect(listedKeys(listBlanks(PREPARED_ALL, before, DEFAULT_SETTINGS))).toContain(keyOf(mRegular));

    const centre = mm(prepared.centerThicknessMm - DEFAULT_CENTRE_FLOOR + SIXTEENTH_MM);
    const after = fitContext(DEFAULT_BOARD_SPEC.outline, inchesToMm(70), centre);
    const floor = floorCheck(prepared, after.board, DEFAULT_SETTINGS);
    expect(floor.passes).toBe(false);
    expect(floor.centerShortBy).toBeCloseTo(SIXTEENTH_MM, 9);

    const list = listBlanks(PREPARED_ALL, after, DEFAULT_SETTINGS);
    const offer = nearestFit(mRegular, list.fits, centre);
    expect(offer).not.toBeNull();
    expectClosestOffer(offer!, mRegular, list.fits, centre);
  });

  it("the offer is always the closest-length fitting blank, over every preset at three centres", () => {
    let offers = 0;
    for (const preset of BOARD_PRESETS) {
      for (const extra of [0, 0.25, 0.5]) {
        const target = mm(preset.foil.center + inchesToMm(extra));
        const ctx = fitContext(preset.outline, preset.outline.length, target, {
          noseTip: preset.foil.noseTip,
          tailTip: preset.foil.tailTip,
        });
        const list = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
        for (const current of list.fits.slice(0, 3)) {
          const offer = nearestFit(current.prepared.record, list.fits, target);
          if (offer === null) {
            // Only possible when the current blank is the one fitting blank.
            expect(list.fits.filter((v) => v !== current)).toEqual([]);
            continue;
          }
          offers++;
          expectClosestOffer(offer, current.prepared.record, list.fits, target);
        }
      }
    }
    expect(offers).toBeGreaterThan(20);
  });

  it("ties on length go to the blank with less spare foam at the centre", () => {
    // Two copies of one real blank at the same length, one a sixteenth thicker at its centre.
    const base = prepareBlank(findBlank(MARKO_VENDOR, M_REGULAR));
    const ctx = defaultContext(70, 2.5);
    const verdict = judgeBlank(base, ctx, DEFAULT_SETTINGS);
    expect(verdict.fits).toBe(true);
    const thinner: BlankVerdict = {
      ...verdict,
      prepared: { ...base, record: { ...base.record, name: "thinner" } },
    };
    const thicker: BlankVerdict = {
      ...verdict,
      prepared: {
        ...base,
        record: { ...base.record, name: "thicker" },
        centerThicknessMm: mm(base.centerThicknessMm + SIXTEENTH_MM),
      },
    };
    const current = { vendor: "Nobody", name: "current", lengthMm: base.lengthMm };
    expect(nearestFit(current, [thicker, thinner], ctx.board.centerThickness)?.prepared.record.name).toBe("thinner");
    expect(nearestFit(current, [thinner, thicker], ctx.board.centerThickness)?.prepared.record.name).toBe("thinner");
  });

  it("F5: no offer when nothing fits, or when only the current blank does", () => {
    const ctx = defaultContext(70, 2.5);
    const list = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
    const current = list.fits[0];
    expect(nearestFit(current.prepared.record, [], ctx.board.centerThickness)).toBeNull();
    expect(nearestFit(current.prepared.record, [current], ctx.board.centerThickness)).toBeNull();
    // A not-fitting verdict handed in by mistake is never offered.
    const failing = list.wontFit[0] ?? { ...list.fits[1], fits: false };
    expect(nearestFit(current.prepared.record, [current, failing], ctx.board.centerThickness)).toBeNull();
  });

  describe("Move to Where It Fits (nearestFittingPlacement)", () => {
    it("moves to the fitting placement nearest to where the board is now — no 1/16\" step closer fits", () => {
      let rescued = 0;
      for (const { ctx } of sweepContexts()) {
        const list = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
        for (const verdict of list.fits) {
          const { prepared } = verdict;
          const range = placementRange(prepared.lengthMm, ctx.board.length);
          for (const from of [0, range.min, range.max, range.max / 3]) {
            if (fitHere(prepared, ctx, DEFAULT_SETTINGS, from).fits) continue;
            if (rescued >= 25) break;
            rescued++;
            const p = nearestFittingPlacement(prepared, ctx, DEFAULT_SETTINGS, mm(from));
            expect(p).not.toBeNull();
            expect(fitHere(prepared, ctx, DEFAULT_SETTINGS, p!).fits).toBe(true);
            expect(p!).toBeGreaterThanOrEqual(range.min);
            expect(p!).toBeLessThanOrEqual(range.max);
            for (const g of sixteenthGrid(prepared, ctx.board.length)) {
              if (Math.abs(g - from) < Math.abs(p! - from) - 1e-9) {
                expect(fitHere(prepared, ctx, DEFAULT_SETTINGS, g).fits).toBe(false);
              }
            }
          }
        }
      }
      expect(rescued).toBeGreaterThan(5);
    });

    it("returns null for a blank that fits nowhere", () => {
      let checked = 0;
      for (const { ctx } of sweepContexts()) {
        for (const verdict of listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS).wontFit.slice(0, 2)) {
          checked++;
          expect(nearestFittingPlacement(verdict.prepared, ctx, DEFAULT_SETTINGS, verdict.placement)).toBeNull();
        }
      }
      expect(checked).toBeGreaterThan(0);
    });

    it("returns where the board already is (clamped into range) when it already fits there", () => {
      const ctx = defaultContext(72, 2.5);
      const list = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
      let clampedChecked = 0;
      for (const verdict of list.fits) {
        const { prepared } = verdict;
        expect(nearestFittingPlacement(prepared, ctx, DEFAULT_SETTINGS, verdict.placement)).toBe(verdict.placement);
        const range = placementRange(prepared.lengthMm, ctx.board.length);
        if (range.max > 0 && fitHere(prepared, ctx, DEFAULT_SETTINGS, range.max).fits) {
          clampedChecked++;
          const past = mm(range.max + inchesToMm(10));
          expect(nearestFittingPlacement(prepared, ctx, DEFAULT_SETTINGS, past)).toBe(
            clampPlacement(past, prepared.lengthMm, ctx.board.length),
          );
        }
      }
      expect(clampedChecked).toBeGreaterThan(0);
    });
  });
});

describe("one planer pass under the board's centre where it sits (D-15)", () => {
  it("a board slid to where less than one pass would come off the bottom at its centre fails thin at the centre by exactly the missing foam, yet the blank still fits elsewhere (F2) and the rescue leaves a full pass", () => {
    const ctx = defaultContext(72, 2.5);
    const L = ctx.board.length;
    const pass = DEFAULT_SETTINGS.planerMaxDepth;
    const list = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
    let underOnePass = 0;
    let found = 0;
    for (const verdict of [...list.fits, ...list.wontFit]) {
      const { prepared } = verdict;
      const range = placementRange(prepared.lengthMm, L);
      for (const end of [range.min, range.max]) {
        const gap = boardOnBlank(prepared, ctx.board, end).bottomOffAt(L / 2);
        if (!(gap > 0 && gap < pass - FIT_EPSILON_MM)) continue;
        underOnePass++;
        const here = fitHere(prepared, ctx, DEFAULT_SETTINGS, end);
        expect(here.fits, keyOf(prepared.record)).toBe(false);
        // Whatever else is tight at this end, the centre alone is short by the missing pass …
        expect(here.worst.amount).toBeGreaterThanOrEqual(pass - gap - 1e-9);
        // … and where the centre is the worst place and the blank fits somewhere else — the flag's
        // F2, "{amount} too thin at the center" — the amount is exactly the missing foam.
        if (here.worst.station !== L / 2) continue;
        if (!judgeBlank(prepared, ctx, DEFAULT_SETTINGS).fits) continue;
        found++;
        expect(here.worst.kind).toBe("thin");
        expect(here.worst.amount).toBeCloseTo(pass - gap, 9);
        const to = nearestFittingPlacement(prepared, ctx, DEFAULT_SETTINGS, end);
        expect(to).not.toBeNull();
        expect(boardOnBlank(prepared, ctx.board, to!).bottomOffAt(L / 2)).toBeGreaterThanOrEqual(pass - FIT_EPSILON_MM);
        expect(fitHere(prepared, ctx, DEFAULT_SETTINGS, to!).fits).toBe(true);
      }
    }
    expect(underOnePass).toBeGreaterThan(0);
    expect(found).toBeGreaterThan(0);
  });

  it("every fitting verdict leaves at least one pass under the board's centre at its placement", () => {
    for (const { label, ctx } of sweepContexts()) {
      for (const verdict of listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS).fits) {
        const onBlank = boardOnBlank(verdict.prepared, ctx.board, verdict.placement);
        expect(
          onBlank.bottomOffAt(ctx.board.length / 2),
          `${label} ${keyOf(verdict.prepared.record)}`,
        ).toBeGreaterThanOrEqual(DEFAULT_SETTINGS.planerMaxDepth - FIT_EPSILON_MM);
      }
    }
  });
});

describe("a board under 1/4\" thick anywhere does not fit (D-18, raised in Phase 13 item 4)", () => {
  it("the least foam a board may be anywhere is 1/4\", and a tip set to exactly that still fits", () => {
    expect(FOIL_THICKNESS_RANGE_IN.min).toBe(1 / 4);
    expect(MIN_FOIL_THICKNESS_MM).toBe(inchesToMm(FOIL_THICKNESS_RANGE_IN.min));
    expect(MIN_FOIL_THICKNESS_MM).toBe(inchesToMm(1 / 4));
    const blank = findBlank(MARKO_VENDOR, M_REGULAR);
    const prepared = prepareBlank(blank);
    const L = blank.lengthMm;
    const board = {
      ...defaultBoard(blank, L, inchesToMm(2.5)),
      noseTip: MIN_FOIL_THICKNESS_MM,
      tailTip: MIN_FOIL_THICKNESS_MM,
    };
    const onBlank = boardOnBlank(prepared, board, mm(0));
    expect(onBlank.thicknessAt(0)).toBe(MIN_FOIL_THICKNESS_MM);
    const result = fitAt(onBlank, narrowerBy(onBlank, inchesToMm(2)), mm(L / 2), DEFAULT_SETTINGS);
    expect(result.fits).toBe(true);
    // The tips are the tightest place, with exactly nothing to spare.
    expect(result.worst.kind).toBe("runsOut");
    expect(result.worst.amount).toBe(0);

    // A sixteenth thinner at the tail tip and the check fires there, by exactly that sixteenth.
    const thinner = boardOnBlank(prepared, { ...board, tailTip: mm(MIN_FOIL_THICKNESS_MM - SIXTEENTH_MM) }, mm(0));
    const failed = fitAt(thinner, narrowerBy(thinner, inchesToMm(2)), mm(L / 2), DEFAULT_SETTINGS);
    expect(failed.fits).toBe(false);
    expect(failed.worst.kind).toBe("runsOut");
    expect(failed.worst.station).toBe(0);
    expect(failed.worst.amount).toBeCloseTo(SIXTEENTH_MM, 9);
  });

  it("a 1\" center on the default board runs out of foam in at least one blank, and says where by how much", () => {
    const ctx = defaultContext(72, 1);
    let runsOut = 0;
    for (const prepared of PREPARED_ALL) {
      if (!isPickable(prepared.record)) continue;
      const verdict = judgeBlank(prepared, ctx, DEFAULT_SETTINGS);
      if (verdict.fits || verdict.worst.kind !== "runsOut") continue;
      runsOut++;
      const onBlank = boardOnBlank(prepared, ctx.board, verdict.placement);
      expect(onBlank.thicknessAt(verdict.worst.station)).toBeCloseTo(MIN_FOIL_THICKNESS_MM - verdict.worst.amount, 9);
      expect(verdict.worst.amount).toBeGreaterThan(FIT_EPSILON_MM);
    }
    expect(runsOut).toBeGreaterThan(0);
  });

  it("from a 2\" center up, no listed blank is ruled out for running out — the default board and every preset", () => {
    const boards = [
      { label: "default", outline: DEFAULT_BOARD_SPEC.outline, length: inchesToMm(72), tips: undefined },
      ...BOARD_PRESETS.map((preset) => ({
        label: preset.id,
        outline: preset.outline,
        length: preset.outline.length,
        tips: { noseTip: preset.foil.noseTip, tailTip: preset.foil.tailTip },
      })),
    ];
    // A FITTING verdict's `worst` is its tightest place with foam to spare, and that can be the
    // thinnest spot on the board (a negative runs-out amount) — so the rule is on the verdicts that
    // fail: none of them fails for running out.
    let judged = 0;
    for (const { label, outline, length, tips } of boards) {
      for (let centreIn = 2; centreIn <= 3; centreIn += 1 / 4) {
        const ctx = fitContext(outline, length, inchesToMm(centreIn), tips);
        const list = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
        for (const verdict of [...list.fits, ...list.wontFit]) {
          judged++;
          const ruledOutForRunningOut = !verdict.fits && verdict.worst.kind === "runsOut";
          expect(ruledOutForRunningOut, `${label} at ${centreIn}": ${keyOf(verdict.prepared.record)}`).toBe(false);
          if (verdict.worst.kind === "runsOut") expect(verdict.worst.amount).toBeLessThanOrEqual(FIT_EPSILON_MM);
        }
      }
    }
    expect(judged).toBeGreaterThan(BOARD_PRESETS.length * 5);
  }, 120_000);
});

describe("a Deck fine-tune bigger than the Deck Skin fits nowhere, and is read at once (D-13)", () => {
  // The default board with its nose 12" tweak pushed `by` past the skin, on the chosen surface.
  const overSkin = (surface: FineTuneSurface, by: Mm = SIXTEENTH_MM): BoardFitContext => {
    const ctx = defaultContext(72, 2.5);
    return { ...ctx, board: { ...ctx.board, nose12Offset: mm(ctx.board.deckSkin + by), fineTuneSurface: surface } };
  };
  const longest = () => PREPARED_ALL.reduce((a, b) => (b.lengthMm > a.lengthMm ? b : a));

  it("no blank fits, each is read at the centre placement, and most read exactly the tweak less the skin too thin at the nose 12\"", () => {
    const ctx = overSkin("deck");
    const result = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
    expect(result.fits).toHaveLength(0);
    expect(result.wontFit.length).toBeGreaterThan(100);
    const nose12 = rockerStationPositions(ctx.board.length).find((p) => p.key === "nose12")!.station;
    let readAsTheTweak = 0;
    for (const verdict of result.wontFit) {
      expect(verdict.fits).toBe(false);
      expect(verdict.placement).toBe(0);
      // Nowhere is the worst smaller than the over-skin amount itself.
      expect(verdict.worst.amount).toBeGreaterThanOrEqual(SIXTEENTH_MM - FIT_EPSILON_MM);
      if (Math.abs(verdict.worst.amount - SIXTEENTH_MM) < 1e-6) {
        expect(verdict.worst.kind).toBe("thin");
        expect(verdict.worst.station).toBeCloseTo(nose12, 6);
        readAsTheTweak++;
      }
    }
    // Where nothing else is tighter — most of the catalogue for the default board — the reason IS the tweak.
    expect(readAsTheTweak).toBeGreaterThan(result.wontFit.length / 2);
  });

  it("hides no fitting placement: every 1/4\" placement of the longest blank fails by at least that much", () => {
    const ctx = overSkin("deck");
    const prepared = longest();
    const { min, max } = placementRange(prepared.lengthMm, ctx.board.length);
    expect(max - min).toBeGreaterThan(inchesToMm(24));
    let tried = 0;
    for (let placement: number = min; placement <= max + 1e-9; placement += QUARTER_MM) {
      const onBlank = boardOnBlank(prepared, ctx.board, clampPlacement(mm(placement), prepared.lengthMm, ctx.board.length));
      const result = fitAt(onBlank, ctx.halfWidthAt, ctx.widePointStation, DEFAULT_SETTINGS);
      expect(result.fits).toBe(false);
      expect(result.worst.amount).toBeGreaterThanOrEqual(SIXTEENTH_MM - FIT_EPSILON_MM);
      tried++;
    }
    expect(tried).toBeGreaterThan(90);
    expect(nearestFittingPlacement(prepared, ctx, DEFAULT_SETTINGS, mm(0))).toBeNull();
  });

  it("the same tweak on the Bottom is searched as before and still fits most of the catalogue", () => {
    const result = listBlanks(PREPARED_ALL, overSkin("bottom"), DEFAULT_SETTINGS);
    expect(result.fits.length).toBeGreaterThan(100);
  });

  it("a tweak exactly the skin is not over it — the list still fits", () => {
    const result = listBlanks(PREPARED_ALL, overSkin("deck", mm(0)), DEFAULT_SETTINGS);
    expect(result.fits.length).toBeGreaterThan(100);
  });

  it("tweakExceedsDeckSkin: true for a Deck tweak 1/16\" past the skin at either 12\" station, false at the skin, on the Bottom or for a negative tweak", () => {
    const board = defaultContext(72, 2.5).board;
    const skin = board.deckSkin;
    const over = mm(skin + SIXTEENTH_MM);
    // Nose or tail, on the Deck: over the skin.
    expect(tweakExceedsDeckSkin({ ...board, fineTuneSurface: "deck", nose12Offset: over, tail12Offset: mm(0) })).toBe(true);
    expect(tweakExceedsDeckSkin({ ...board, fineTuneSurface: "deck", nose12Offset: mm(0), tail12Offset: over })).toBe(true);
    // Exactly the skin is not over it.
    expect(tweakExceedsDeckSkin({ ...board, fineTuneSurface: "deck", nose12Offset: skin, tail12Offset: skin })).toBe(false);
    // The same tweak on the Bottom never lifts the deck.
    expect(tweakExceedsDeckSkin({ ...board, fineTuneSurface: "bottom", nose12Offset: over, tail12Offset: over })).toBe(false);
    // A negative tweak takes foam away — never over the skin.
    const under = mm(-(skin + SIXTEENTH_MM));
    expect(tweakExceedsDeckSkin({ ...board, fineTuneSurface: "deck", nose12Offset: under, tail12Offset: under })).toBe(false);
  });

  it("judges the whole catalogue in under 250 ms when nothing fits (12-08 measured 1.3 s in Node, ~40 s on WebKit)", () => {
    const ctx = overSkin("deck");
    const started = performance.now();
    const result = listBlanks(PREPARED_ALL, ctx, DEFAULT_SETTINGS);
    const elapsed = performance.now() - started;
    expect(result.wontFit.length).toBeGreaterThan(100);
    expect(elapsed).toBeLessThan(250);
  });
});
