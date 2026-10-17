import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { starKey } from "@/lib/starred-blanks-preference";
import golden from "./__fixtures__/custom-rocker-golden.json";
import type { BlankRecord } from "./blank";
import { blankTipRockers, prepareBlank, prepareBlankPchip, type PreparedBlank } from "./blank-fit";
import { CATALOG_STATION_LABELS, printedBlankStations } from "./board-profile";
import {
  bendAt,
  bendPoint,
  bendStartRange,
  blankDisplayLines,
  blankDisplayName,
  blankStarIdentity,
  customPrintedStations,
  draftFloor,
  draftFromSpec,
  floorOf,
  formatRockerNote,
  isNaturalSpec,
  naturalOf,
  NATURAL_DRAFT,
  normalizeSpec,
  orderedTipRockers,
  parseRockerNote,
  prepareBoardBlank,
  rockerNoteParts,
  rockerSpecOf,
  ROCKER_KNOT_STEP_MM,
  sameRockerSpec,
  specFromDraft,
  withCustomRocker,
  withDraftAmount,
  withDraftBendStart,
  withoutChange,
  withSecondChange,
  ROCKER_CHANGE_MAX_MM,
  type BlankRockerSpec,
  type RockerChange,
  type RockerDraft,
} from "./custom-rocker";
import { pchipMinimum } from "./pchip";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm, mmToInches } from "./units";

/** The blank a preset opens in — the Longboard in the US Blanks 9'4"B, the Shortboard in the 6'3"RP. */
function presetCopy(id: string): BlankRecord {
  const preset = BOARD_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`no ${id} preset`);
  const blank = presetDesignFields(preset).blank;
  if (!blank) throw new Error(`${id} opens in no blank`);
  return blank.copy;
}

const LONG = presetCopy("longboard");
const SHORT = presetCopy("shortboard");
const BLANKS: [string, BlankRecord][] = [
  ["the Longboard's blank", LONG],
  ["the Shortboard's blank", SHORT],
];

const nose = (amountIn: number, fromTipIn?: number): RockerChange =>
  fromTipIn === undefined
    ? { end: "nose", amount: inchesToMm(amountIn) }
    : { end: "nose", amount: inchesToMm(amountIn), fromTip: inchesToMm(fromTipIn) };
const tail = (amountIn: number, fromTipIn?: number): RockerChange =>
  fromTipIn === undefined
    ? { end: "tail", amount: inchesToMm(amountIn) }
    : { end: "tail", amount: inchesToMm(amountIn), fromTip: inchesToMm(fromTipIn) };
const spec = (...changes: RockerChange[]): BlankRockerSpec => ({ changes });

/** 41 even points along a blank, both tips included. */
function points(L: number): number[] {
  return Array.from({ length: 41 }, (_, i) => (L * i) / 40);
}

const SPECS: [string, BlankRockerSpec][] = [
  ['+1/2"N', spec(nose(0.5))],
  ['+1/2"N +1/2"N18"', spec(nose(0.5), nose(0.5, 18))],
  ['-1/4"N18" +1/8"T36" +1/8"T18"', spec(nose(-0.25, 18), tail(0.125, 36), tail(0.125, 18))],
  ['-1/2"N24" +1/2"T24"', spec(nose(-0.5, 24), tail(0.5, 24))],
  ['+3/8"N +3/8"T', spec(nose(0.375), tail(0.375))],
];

describe("bendAt — the even bend (spike 002, D-05)", () => {
  it.each(BLANKS)("%s: a natural spec bends nothing anywhere", (_, copy) => {
    for (const x of points(copy.lengthMm)) {
      expect(bendAt(undefined, copy.lengthMm, x)).toBe(0);
      expect(bendAt(spec(), copy.lengthMm, x)).toBe(0);
    }
  });

  it.each(BLANKS)("%s: a nose change is 0 at and inside its bend point and its full amount at the nose tip", (_, copy) => {
    const L = copy.lengthMm;
    for (const change of [nose(0.5), nose(-0.25, 18), nose(1, 3)]) {
      const s = spec(change);
      const p = bendPoint(change, L);
      for (const x of points(L).filter((x) => x <= p)) expect(bendAt(s, L, x)).toBe(0);
      expect(bendAt(s, L, p)).toBe(0);
      expect(bendAt(s, L, L)).toBeCloseTo(change.amount, 12);
    }
  });

  it.each(BLANKS)("%s: a tail change is 0 at and inside its bend point and its full amount at the tail tip", (_, copy) => {
    const L = copy.lengthMm;
    for (const change of [tail(0.5), tail(-0.25, 18), tail(1, 3)]) {
      const s = spec(change);
      const p = bendPoint(change, L);
      for (const x of points(L).filter((x) => x >= p)) expect(bendAt(s, L, x)).toBe(0);
      expect(bendAt(s, L, p)).toBe(0);
      expect(bendAt(s, L, 0)).toBeCloseTo(change.amount, 12);
    }
  });

  it.each(BLANKS)("%s: the bend starts with zero slope — no kink at the bend point", (_, copy) => {
    const L = copy.lengthMm;
    for (const change of [nose(1), nose(-1, 18), tail(1), tail(-1, 24)]) {
      const s = spec(change);
      const p = bendPoint(change, L);
      const h = 0.01;
      const slope = (bendAt(s, L, p + h) - bendAt(s, L, p - h)) / (2 * h);
      expect(Math.abs(slope)).toBeLessThan(1e-6);
    }
  });

  it.each(BLANKS)("%s: two changes add — the bend of both is the sum of each", (_, copy) => {
    const L = copy.lengthMm;
    const pairs: [RockerChange, RockerChange][] = [
      [nose(0.5), nose(0.5, 18)],
      [nose(-0.25, 18), tail(0.125, 36)],
      [tail(0.5), tail(-0.5, 18)],
    ];
    for (const [a, b] of pairs) {
      for (const x of points(L)) {
        expect(Math.abs(bendAt(spec(a, b), L, x) - (bendAt(spec(a), L, x) + bendAt(spec(b), L, x)))).toBeLessThan(1e-9);
      }
    }
  });

  it.each(BLANKS)('%s: +1/2"N +1/2"N18" lifts the nose tip exactly 1" (D-05)', (_, copy) => {
    expect(bendAt(spec(nose(0.5), nose(0.5, 18)), copy.lengthMm, copy.lengthMm)).toBe(inchesToMm(1));
  });

  it("the centre is half the blank's length (P-6); a figure is that far in from its own tip", () => {
    const L = LONG.lengthMm;
    expect(bendPoint(nose(0.5), L)).toBe(L / 2);
    expect(bendPoint(tail(0.5), L)).toBe(L / 2);
    expect(bendPoint(nose(0.5, 18), L)).toBe(L - inchesToMm(18));
    expect(bendPoint(tail(0.5, 18), L)).toBe(inchesToMm(18));
  });
});

describe("normalizeSpec — the spec the app would have written (D-05, P-9)", () => {
  const L = LONG.lengthMm;

  it("isNaturalSpec: absent, empty and all-zero specs are natural", () => {
    expect(isNaturalSpec(undefined)).toBe(true);
    expect(isNaturalSpec(spec())).toBe(true);
    expect(isNaturalSpec(spec(nose(0), tail(0, 18)))).toBe(true);
    expect(isNaturalSpec(spec(nose(1 / 16)))).toBe(false);
  });

  it("drops a change whose amount is zero", () => {
    expect(normalizeSpec(spec(nose(0), tail(0.25)), L)).toEqual(spec(tail(0.25)));
  });

  it("clamps each amount to ±2\"", () => {
    const out = normalizeSpec(spec(nose(3), tail(-2.5)), L);
    expect(out.changes.map((c) => c.amount)).toEqual([ROCKER_CHANGE_MAX_MM, -ROCKER_CHANGE_MAX_MM]);
  });

  it("rounds a bend point to whole inches", () => {
    expect(normalizeSpec(spec(nose(0.5, 17.6)), L)).toEqual(spec(nose(0.5, 18)));
    expect(normalizeSpec(spec(tail(0.5, 12.2)), L)).toEqual(spec(tail(0.5, 12)));
  });

  it("reads a bend point at or past the centre's whole inch as the centre, with no figure", () => {
    const centreIn = Math.floor(L / 2 / inchesToMm(1) + 1e-9);
    const out = normalizeSpec(spec(nose(0.5, centreIn), tail(0.5, centreIn + 10)), L);
    expect(out).toEqual(spec(nose(0.5), tail(0.5)));
    expect("fromTip" in out.changes[0]).toBe(false);
    expect(normalizeSpec(spec(nose(0.5, centreIn - 1)), L)).toEqual(spec(nose(0.5, centreIn - 1)));
  });

  it("holds a bend point at least 3\" in from its tip", () => {
    expect(normalizeSpec(spec(nose(0.5, 1)), L)).toEqual(spec(nose(0.5, 3)));
    expect(normalizeSpec(spec(tail(0.5, 0)), L)).toEqual(spec(tail(0.5, 3)));
  });

  it("orders each end from the centre outward, nose before tail", () => {
    expect(normalizeSpec(spec(tail(0.125, 18), nose(0.5, 18), tail(0.125, 36), nose(0.5)), L)).toEqual(
      spec(nose(0.5), nose(0.5, 18), tail(0.125, 36), tail(0.125, 18)),
    );
  });

  it("keeps at most two changes per end", () => {
    expect(normalizeSpec(spec(nose(0.125, 12), nose(0.25, 6), nose(0.25, 3)), L)).toEqual(
      spec(nose(0.125, 12), nose(0.25, 6)),
    );
  });

  it("puts a second change at least one inch nearer its tip than the first", () => {
    expect(normalizeSpec(spec(nose(0.5, 18), nose(0.25, 18)), L)).toEqual(spec(nose(0.5, 18), nose(0.25, 17)));
    const centreIn = Math.floor(L / 2 / inchesToMm(1) + 1e-9);
    expect(normalizeSpec(spec(tail(0.5), tail(0.25)), L)).toEqual(spec(tail(0.5), tail(0.25, centreIn - 1)));
  });

  it("moves a first change at 3\" to 4\" so a second has 3\" to sit at (P-9)", () => {
    expect(normalizeSpec(spec(nose(0.5, 3), nose(0.25, 3)), L)).toEqual(spec(nose(0.5, 4), nose(0.25, 3)));
  });

  it("returns a fresh object and never writes to its input", () => {
    const input = spec(nose(0.5, 18.4));
    const frozen = JSON.stringify(input);
    const out = normalizeSpec(input, L);
    expect(out).not.toBe(input);
    expect(out.changes[0]).not.toBe(input.changes[0]);
    expect(JSON.stringify(input)).toBe(frozen);
  });

  it("sameRockerSpec: equal after normalising, natural equals natural, anything else differs", () => {
    expect(sameRockerSpec(undefined, spec())).toBe(true);
    expect(sameRockerSpec(spec(nose(0)), undefined)).toBe(true);
    expect(sameRockerSpec(spec(nose(0.5, 18.2)), spec(nose(0.5, 18)), L)).toBe(true);
    expect(sameRockerSpec(spec(tail(0.25), nose(0.5)), spec(nose(0.5), tail(0.25)), L)).toBe(true);
    expect(sameRockerSpec(spec(nose(0.5)), spec(nose(0.5)))).toBe(true);
    expect(sameRockerSpec(spec(nose(0.5)), spec(nose(0.5, 18)), L)).toBe(false);
    expect(sameRockerSpec(spec(nose(0.5)), spec(nose(0.4375)), L)).toBe(false);
    expect(sameRockerSpec(spec(nose(0.5)), undefined)).toBe(false);
    expect(sameRockerSpec(spec(nose(0.5)), spec(tail(0.5)))).toBe(false);
  });
});

describe("withCustomRocker — the blank bent the maker's way", () => {
  it.each(BLANKS)("%s: a natural spec returns the very same prepared blank", (_, copy) => {
    const prepared = prepareBlank(copy);
    expect(withCustomRocker(prepared, undefined)).toBe(prepared);
    expect(withCustomRocker(prepared, spec())).toBe(prepared);
    expect(withCustomRocker(prepared, spec(nose(0)))).toBe(prepared);
  });

  describe.each(BLANKS)("%s", (_, copy) => {
    const natural = prepareBlank(copy);
    const L = natural.lengthMm;

    it.each(SPECS)("%s: every printed station reads exactly printed + bend", (__, s) => {
      const bent = withCustomRocker(natural, s);
      const labels = Object.values(CATALOG_STATION_LABELS);
      let checked = 0;
      for (const station of copy.stations) {
        if (!labels.includes(station.label) || station.rockerMm === null) continue;
        expect(bent.rocker.curve.sample(station.fromTailMm)).toBe(
          station.rockerMm + bendAt(rockerSpecOf(bent), L, station.fromTailMm),
        );
        checked++;
      }
      expect(checked).toBe(5);
    });

    it.each(SPECS)("%s: between knots the bent curve is the natural curve plus the bend", (__, s) => {
      const bent = withCustomRocker(natural, s);
      const normal = normalizeSpec(s, L);
      for (let x = 0; x <= L; x += 0.5) {
        expect(Math.abs(bent.rocker.curve.sample(x) - (natural.rocker.curve.sample(x) + bendAt(normal, L, x)))).toBeLessThan(1e-3);
      }
    });

    it.each(SPECS)("%s: levelled on its own true low point, the fit untouched", (__, s) => {
      const bent = withCustomRocker(natural, s);
      expect(bent.rocker.minimum).toBe(pchipMinimum(bent.rocker.curve, 0, L));
      expect(bent.thickness).toBe(natural.thickness);
      expect(bent.width).toBe(natural.width);
      expect(bent.record).toBe(natural.record);
      expect(bent.lengthMm).toBe(natural.lengthMm);
      expect(bent.centerThicknessMm).toBe(natural.centerThicknessMm);
      expect(rockerSpecOf(bent)).toEqual(normalizeSpec(s, L));
      const back = naturalOf(bent);
      expect(back.rocker).toBe(natural.rocker);
      expect(back.thickness).toBe(natural.thickness);
      expect("custom" in back).toBe(false);
      expect(rockerSpecOf(natural)).toBeUndefined();
      expect(naturalOf(natural)).toBe(natural);
    });

    it("bending again starts from natural — bends never stack across calls", () => {
      const a = spec(nose(0.5), tail(0.25, 18));
      const b = spec(nose(-0.25, 18));
      const twice = withCustomRocker(withCustomRocker(natural, a), b);
      const once = withCustomRocker(natural, b);
      for (const x of points(L)) expect(twice.rocker.sample(x)).toBe(once.rocker.sample(x));
      expect(withCustomRocker(withCustomRocker(natural, a), undefined).rocker).toBe(natural.rocker);
    });

    it("prepareBoardBlank is the board's copy prepared, then bent by the board's rocker", () => {
      const s = spec(nose(0.5), nose(0.5, 18));
      const viaHelper = prepareBoardBlank({ copy, rocker: s });
      const byHand = withCustomRocker(prepareBlank(copy), s);
      const plain = prepareBoardBlank({ copy });
      const before = prepareBoardBlank({ copy, rocker: s }, prepareBlankPchip);
      const beforeByHand = withCustomRocker(prepareBlankPchip(copy), s);
      for (const x of points(L)) {
        expect(viaHelper.rocker.sample(x)).toBe(byHand.rocker.sample(x));
        expect(plain.rocker.sample(x)).toBe(natural.rocker.sample(x));
        expect(before.rocker.sample(x)).toBe(beforeByHand.rocker.sample(x));
      }
      expect(plain.custom).toBeUndefined();
    });
  });

  it('the Longboard\'s blank: +1/2"N +1/2"N18" lifts the levelled nose tip exactly 1" (the sketch: 4 3/4" → 5 3/4")', () => {
    const natural = prepareBlank(LONG);
    const bent = withCustomRocker(natural, spec(nose(0.5), nose(0.5, 18)));
    const L = natural.lengthMm;
    expect(bent.rocker.minimum).toBe(natural.rocker.minimum);
    expect(bent.rocker.sample(L) - natural.rocker.sample(L)).toBeCloseTo(inchesToMm(1), 9);
  });

  it("a spec past its floor is levelled, never clamped — its lowest point reads 0", () => {
    const natural: PreparedBlank = prepareBlank(SHORT);
    const bent = withCustomRocker(natural, spec(tail(-2)));
    const L = natural.lengthMm;
    let lowest = Infinity;
    for (let x = 0; x <= L; x += mm(1)) lowest = Math.min(lowest, bent.rocker.sample(x));
    expect(lowest).toBeGreaterThanOrEqual(-1e-9);
    // Its tail went below the blank's old low point, so the whole curve re-levelled on the new one.
    expect(bent.rocker.minimum).toBeLessThan(natural.rocker.minimum);
    expect(bent.rocker.minimum).toBe(bent.rocker.curve.sample(0));
    expect(bent.rocker.sample(0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
// Task 2 — proven against the sketch's own code (lib/geometry/__fixtures__/custom-rocker-golden.json,
// written by scripts/extract-sketch016-custom-rocker-golden.mjs from reference/sketches/016-…).
// ---------------------------------------------------------------------------------------------

/** A spec in the sketch's form: inches, `f` whole inches in from the tip or null for the centre. */
interface SketchChange {
  a: number;
  f: number | null;
}
interface SketchSpec {
  nose: SketchChange[];
  tail: SketchChange[];
}

/** The sketch's spec as the app's: nose then tail, each through `inchesToMm`. */
function fromSketch(s: SketchSpec): BlankRockerSpec {
  const one = (end: "nose" | "tail", c: SketchChange): RockerChange =>
    c.f === null ? { end, amount: inchesToMm(c.a) } : { end, amount: inchesToMm(c.a), fromTip: inchesToMm(c.f) };
  return { changes: [...s.nose.map((c) => one("nose", c)), ...s.tail.map((c) => one("tail", c))] };
}

const GOLDEN_COPY: Record<string, BlankRecord> = { longboard: LONG, shortboard: SHORT };
const GOLDEN_PREPARED: Record<string, PreparedBlank> = {
  longboard: prepareBlank(LONG),
  shortboard: prepareBlank(SHORT),
};
const IMPERIAL_STEP = inchesToMm(1 / 16);
const METRIC_STEP = mm(1);
type GoldenCase = (typeof golden.cases)[number];
const CASE_ROWS: [string, GoldenCase][] = golden.cases.map((c) => [`${c.board} ${c.label}`, c]);

describe("the golden itself", () => {
  it("was written from the two blanks the sketch was drawn on, which these tests read", () => {
    expect(golden.units).toBe("inches");
    expect(golden.cases).toHaveLength(24);
    expect(golden.listing).toHaveLength(282);
    for (const board of golden.boards) {
      const copy = GOLDEN_COPY[board.id];
      expect([board.vendor, board.name]).toEqual([copy.vendor, copy.name]);
      expect(board.lengthIn).toBe(mmToInches(copy.lengthMm));
    }
  });
});

describe("bendAt and formatRockerNote agree with the sketch's delta and noteOf", () => {
  it.each(CASE_ROWS)("%s", (_, c) => {
    const copy = GOLDEN_COPY[c.board];
    const s = fromSketch(c.spec as SketchSpec);
    for (const point of [...c.stations, ...c.samples]) {
      const app = mmToInches(mm(bendAt(s, copy.lengthMm, inchesToMm(point.xIn))));
      expect(Math.abs(app - point.delta)).toBeLessThan(1e-9);
    }
    expect(c.stations).toHaveLength(5);
    expect(c.samples).toHaveLength(41);
    expect(formatRockerNote(s)).toBe(c.note);
  });
});

describe("floorOf agrees with the sketch's floorOf (D-06, P-1)", () => {
  it.each(CASE_ROWS)("%s", (_, c) => {
    const prepared = GOLDEN_PREPARED[c.board];
    const s = fromSketch(c.spec as SketchSpec);
    const noseCount = (c.spec as SketchSpec).nose.length;
    for (const f of c.floors) {
      const at = f.end === "nose" ? f.index : noseCount + f.index;
      const others = { changes: s.changes.filter((_, i) => i !== at) };
      for (const [stepMm, stepIn, sketchFloor] of [
        [IMPERIAL_STEP, mmToInches(IMPERIAL_STEP), f.imperial],
        [METRIC_STEP, mmToInches(METRIC_STEP), f.metric],
      ] as const) {
        const app = floorOf(prepared, s.changes[at], others, stepMm);
        // The same number of slider steps, exactly; and the same length to float noise.
        expect(Math.round(app / stepMm)).toBe(Math.round(sketchFloor / stepIn));
        expect(mmToInches(app)).toBeCloseTo(sketchFloor, 9);
      }
    }
  });

  it("counts 76 floors across both boards, both systems", () => {
    expect(golden.cases.reduce((n, c) => n + c.floors.length * 2, 0)).toBe(76);
  });

  it('-2"T on the Shortboard\'s blank lands on its floor, above -2"; on the Longboard\'s it reaches -2"', () => {
    const short = golden.cases.find((c) => c.board === "shortboard" && c.label === '-2"T')!;
    const long = golden.cases.find((c) => c.board === "longboard" && c.label === '-2"T')!;
    expect(short.floors[0].imperial).toBeGreaterThan(-2);
    expect(long.floors[0].imperial).toBe(-2);
    const tailOnly = { end: "tail" as const, amount: inchesToMm(-2) };
    expect(mmToInches(floorOf(GOLDEN_PREPARED.shortboard, tailOnly, { changes: [] }, IMPERIAL_STEP))).toBeCloseTo(
      short.floors[0].imperial,
      9,
    );
    expect(floorOf(GOLDEN_PREPARED.longboard, tailOnly, { changes: [] }, IMPERIAL_STEP)).toBe(-ROCKER_CHANGE_MAX_MM);
  });

  it.each(CASE_ROWS)("%s: at its floor the bent blank never dips below its low point; one step lower, it does", (_, c) => {
    const prepared = GOLDEN_PREPARED[c.board];
    const L = prepared.lengthMm;
    const s = fromSketch(c.spec as SketchSpec);
    const xs: number[] = [];
    for (let k = 0; k * ROCKER_KNOT_STEP_MM < L; k++) xs.push(k * ROCKER_KNOT_STEP_MM);
    xs.push(L, ...prepared.record.stations.map((st) => st.fromTailMm));
    const lowest = (spec: BlankRockerSpec) => Math.min(...xs.map((x) => prepared.rocker.sample(x) + bendAt(spec, L, x)));
    s.changes.forEach((change, at) => {
      const others = { changes: s.changes.filter((_, i) => i !== at) };
      const floor = floorOf(prepared, change, others, IMPERIAL_STEP);
      const atFloor = { changes: s.changes.map((ch, i) => (i === at ? { ...ch, amount: floor } : ch)) };
      // At its floor no point of the bent blank reads below the low point; one step lower, the worst one does.
      expect(lowest(atFloor)).toBeGreaterThanOrEqual(-1e-6);
      if (floor > -ROCKER_CHANGE_MAX_MM + 1e-9) {
        const lower = { changes: s.changes.map((ch, i) => (i === at ? { ...ch, amount: mm(floor - IMPERIAL_STEP) } : ch)) };
        expect(lowest(lower)).toBeLessThan(0);
      }
    });
  });
});

describe("parseRockerNote — the note read back (P-10)", () => {
  it("agrees with the sketch's reader on all 282 listing lines: 237 read, 45 refused", () => {
    let read = 0;
    for (const entry of golden.listing) {
      const app = parseRockerNote(entry.body);
      if (entry.parsed === null) {
        expect(app, entry.line).toBeNull();
        continue;
      }
      read++;
      const want = fromSketch(entry.parsed as SketchSpec);
      expect(app, entry.line).not.toBeNull();
      expect(app!.changes.length, entry.line).toBe(want.changes.length);
      app!.changes.forEach((change, i) => {
        expect(change.end, entry.line).toBe(want.changes[i].end);
        expect(change.amount, entry.line).toBeCloseTo(want.changes[i].amount, 9);
        expect(change.fromTip, entry.line).toBe(want.changes[i].fromTip);
      });
    }
    expect(read).toBe(237);
  });

  it("round-trips every golden case's note", () => {
    for (const c of golden.cases) {
      const s = fromSketch(c.spec as SketchSpec);
      expect(sameRockerSpec(parseRockerNote(formatRockerNote(s)), s), c.label).toBe(true);
    }
  });

  it("round-trips every amount from -2\" to +2\" by 1/16\" on both ends, with and without a bend point", () => {
    for (let k = -32; k <= 32; k++) {
      for (const end of ["nose", "tail"] as const) {
        for (const fromTipIn of [undefined, 18]) {
          const change: RockerChange =
            fromTipIn === undefined
              ? { end, amount: inchesToMm(k / 16) }
              : { end, amount: inchesToMm(k / 16), fromTip: inchesToMm(fromTipIn) };
          const s = spec(change);
          expect(sameRockerSpec(parseRockerNote(formatRockerNote(s)), s), `${k}/16 ${end} ${fromTipIn}`).toBe(true);
        }
      }
    }
  });

  it("reads the bare words for natural, and refuses what is not a plain change", () => {
    for (const text of ["Natural", "NAT", "nat", "", "  "]) expect(parseRockerNote(text), text).toEqual({ changes: [] });
    for (const text of ["Hawaii", "94B B/C", 'TM Flat +3/4"T24"', '-1/8"N12" -1/8"N6" -1/4"N3"']) {
      expect(parseRockerNote(text), text).toBeNull();
    }
  });
});

describe("the figures as ordered (D-03)", () => {
  const keys = Object.keys(CATALOG_STATION_LABELS) as (keyof typeof CATALOG_STATION_LABELS)[];

  it.each(CASE_ROWS)("%s: printed + bend at each printed station, thickness and width untouched", (_, c) => {
    const copy = GOLDEN_COPY[c.board];
    const s = normalizeSpec(fromSketch(c.spec as SketchSpec), copy.lengthMm);
    const printed = printedBlankStations(copy);
    const ordered = customPrintedStations(copy, s);
    for (const key of keys) {
      const station = copy.stations.find((st) => st.label === CATALOG_STATION_LABELS[key])!;
      expect(ordered[key].thickness).toBe(printed[key].thickness);
      expect(ordered[key].width).toBe(printed[key].width);
      expect(ordered[key].rocker).toBe(
        printed[key].rocker === null ? null : printed[key].rocker! + bendAt(s, copy.lengthMm, station.fromTailMm),
      );
    }
    if (isNaturalSpec(s)) expect(ordered).toEqual(printed);
  });

  it("a printed dash stays a dash", () => {
    const copy: BlankRecord = {
      ...LONG,
      stations: LONG.stations.map((st) => (st.label === "N12" ? { ...st, rockerMm: null } : st)),
    };
    const ordered = customPrintedStations(copy, spec(nose(0.5)));
    expect(ordered.nose12.rocker).toBeNull();
    expect(ordered.noseTip.rocker).not.toBeNull();
  });

  it.each(BLANKS)("%s: orderedTipRockers is the printed tips for a natural blank and the tips as ordered for a bent one", (_, copy) => {
    const natural = prepareBlank(copy);
    expect(orderedTipRockers(natural)).toEqual(blankTipRockers(natural));
    const s = spec(nose(0.5), nose(0.5, 18), tail(-0.25, 18));
    const bent = withCustomRocker(natural, s);
    const ordered = customPrintedStations(copy, rockerSpecOf(bent));
    expect(orderedTipRockers(bent)).toEqual({ nose: ordered.noseTip.rocker, tail: ordered.tailTip.rocker });
  });
});

describe("the note's parts and the blank's two-line name (D-02)", () => {
  it.each(CASE_ROWS)("%s: the parts join to the note, first changes order 1 and second order 2", (_, c) => {
    const s = fromSketch(c.spec as SketchSpec);
    const parts = rockerNoteParts(s);
    expect(parts.map((p) => p.text).join(" ")).toBe(formatRockerNote(s));
    for (const end of ["nose", "tail"] as const) {
      expect(parts.filter((p) => p.end === end).map((p) => p.order)).toEqual(
        (c.spec as SketchSpec)[end].map((_, i) => (i === 0 ? 1 : 2)),
      );
    }
  });

  it("writes the founder's example", () => {
    expect(formatRockerNote(spec(nose(-0.25, 18), tail(0.125, 36), tail(0.125, 18)))).toBe('-1/4"N18" +1/8"T36" +1/8"T18"');
    expect(formatRockerNote(undefined)).toBe("");
  });

  it("names a blank on two lines, on one, with its maker, and as a star", () => {
    const s = spec(nose(-0.25, 18), tail(0.125, 36));
    expect(blankDisplayLines(LONG)).toEqual([LONG.name, "Natural"]);
    expect(blankDisplayLines(LONG, s)).toEqual([LONG.name, formatRockerNote(s)]);
    expect(blankDisplayName(LONG)).toBe(`${LONG.name} Natural`);
    expect(blankDisplayName(LONG, s)).toBe(`${LONG.name} ${formatRockerNote(s)}`);
    expect(blankDisplayName(LONG, undefined, { vendor: true })).toBe(`${LONG.vendor} ${LONG.name} Natural`);
    expect(blankDisplayName(LONG, s, { vendor: true })).toBe(`${LONG.vendor} ${LONG.name} ${formatRockerNote(s)}`);
    expect(blankStarIdentity(LONG)).toEqual([LONG.vendor, LONG.name]);
    expect(blankStarIdentity(LONG, spec())).toEqual([LONG.vendor, LONG.name]);
    expect(blankStarIdentity(LONG, s)).toEqual([LONG.vendor, blankDisplayName(LONG, s)]);
    expect(starKey(...blankStarIdentity(LONG))).toBe(starKey(LONG.vendor, LONG.name));
  });
});

describe("the popup's draft rules (D-05, P-9)", () => {
  const prepared = GOLDEN_PREPARED.longboard;
  const L = prepared.lengthMm;
  const centreIn = Math.floor(mmToInches(mm(L / 2)) + 1e-9);

  it("a natural spec drafts as one zero row per end at the centre", () => {
    expect(draftFromSpec(undefined, L)).toEqual(NATURAL_DRAFT);
    expect(draftFromSpec(spec(), L)).toEqual(NATURAL_DRAFT);
  });

  it.each(CASE_ROWS)("%s: draft and back is the same spec", (_, c) => {
    const copy = GOLDEN_COPY[c.board];
    const s = fromSketch(c.spec as SketchSpec);
    expect(sameRockerSpec(specFromDraft(draftFromSpec(s, copy.lengthMm), copy.lengthMm), s, copy.lengthMm)).toBe(true);
  });

  it("bendStartRange: a first row runs 3\" to the centre, a second 3\" to one inch nearer the tip than the first", () => {
    const one: RockerDraft = { nose: [{ amount: inchesToMm(0.5), fromTipIn: 24 }], tail: NATURAL_DRAFT.tail };
    expect(bendStartRange(L, one, "nose", 0)).toEqual({ min: 3, max: centreIn, centreAt: centreIn });
    const two: RockerDraft = { ...one, nose: [...one.nose, { amount: inchesToMm(0.25), fromTipIn: 12 }] };
    expect(bendStartRange(L, two, "nose", 0)).toEqual({ min: 4, max: centreIn, centreAt: centreIn });
    expect(bendStartRange(L, two, "nose", 1)).toEqual({ min: 3, max: 23, centreAt: null });
    const fromCentre: RockerDraft = { ...two, nose: [{ amount: inchesToMm(0.5), fromTipIn: null }, two.nose[1]] };
    expect(bendStartRange(L, fromCentre, "nose", 1)).toEqual({ min: 3, max: centreIn - 1, centreAt: null });
  });

  it("withDraftAmount never goes below the row's floor nor above +2\"", () => {
    const short = GOLDEN_PREPARED.shortboard;
    const down = withDraftAmount(short, NATURAL_DRAFT, "tail", 0, inchesToMm(-2), IMPERIAL_STEP);
    expect(down.tail[0].amount).toBe(draftFloor(short, down, "tail", 0, IMPERIAL_STEP));
    expect(down.tail[0].amount).toBeGreaterThan(-ROCKER_CHANGE_MAX_MM);
    const up = withDraftAmount(short, NATURAL_DRAFT, "nose", 0, inchesToMm(3), IMPERIAL_STEP);
    expect(up.nose[0].amount).toBe(ROCKER_CHANGE_MAX_MM);
    const mid = withDraftAmount(short, NATURAL_DRAFT, "nose", 0, inchesToMm(0.5), IMPERIAL_STEP);
    expect(mid.nose[0].amount).toBe(inchesToMm(0.5));
    expect(NATURAL_DRAFT.nose[0].amount).toBe(0);
  });

  it("withDraftBendStart on a first row pushes a second row ahead of it and re-clamps every amount", () => {
    const draft: RockerDraft = {
      nose: [
        { amount: inchesToMm(0.5), fromTipIn: 24 },
        { amount: inchesToMm(0.25), fromTipIn: 18 },
      ],
      tail: NATURAL_DRAFT.tail,
    };
    const moved = withDraftBendStart(prepared, draft, "nose", 0, 12, IMPERIAL_STEP);
    expect(moved.nose[0].fromTipIn).toBe(12);
    expect(moved.nose[1].fromTipIn).toBe(11);
    const toCentre = withDraftBendStart(prepared, draft, "nose", 0, centreIn + 5, IMPERIAL_STEP);
    expect(toCentre.nose[0].fromTipIn).toBeNull();
    expect(toCentre.nose[1].fromTipIn).toBe(18);
    const tooNear = withDraftBendStart(prepared, draft, "nose", 1, 30, IMPERIAL_STEP);
    expect(tooNear.nose[1].fromTipIn).toBe(23);
    // A lowered tail that sat at its floor from the centre is re-clamped when its bend moves.
    const short = GOLDEN_PREPARED.shortboard;
    const low = withDraftAmount(short, NATURAL_DRAFT, "tail", 0, inchesToMm(-2), IMPERIAL_STEP);
    const lowMoved = withDraftBendStart(short, low, "tail", 0, 12, IMPERIAL_STEP);
    for (const end of ["nose", "tail"] as const) {
      lowMoved[end].forEach((row, i) => expect(row.amount).toBeGreaterThanOrEqual(draftFloor(short, lowMoved, end, i, IMPERIAL_STEP)));
    }
  });

  it("withSecondChange adds +1/8\" from 18\" in, or the nearest allowed point, and moves a first row at 3\" to 4\" (P-9)", () => {
    const fromCentre = withSecondChange(prepared, NATURAL_DRAFT, "nose", IMPERIAL_STEP);
    expect(fromCentre.nose).toEqual([
      { amount: 0, fromTipIn: null },
      { amount: inchesToMm(1 / 8), fromTipIn: 18 },
    ]);
    const near: RockerDraft = { nose: NATURAL_DRAFT.nose, tail: [{ amount: inchesToMm(0.25), fromTipIn: 12 }] };
    expect(withSecondChange(prepared, near, "tail", IMPERIAL_STEP).tail[1]).toEqual({ amount: inchesToMm(1 / 8), fromTipIn: 11 });
    const atThree: RockerDraft = { nose: [{ amount: inchesToMm(0.25), fromTipIn: 3 }], tail: NATURAL_DRAFT.tail };
    const added = withSecondChange(prepared, atThree, "nose", IMPERIAL_STEP);
    expect(added.nose.map((row) => row.fromTipIn)).toEqual([4, 3]);
    expect(withSecondChange(prepared, added, "nose", IMPERIAL_STEP)).toBe(added);
  });

  it("withoutChange removes a row and never leaves an end with none", () => {
    const two = withSecondChange(prepared, NATURAL_DRAFT, "tail", IMPERIAL_STEP);
    const one = withoutChange(prepared, two, "tail", 0, IMPERIAL_STEP);
    expect(one.tail).toEqual([{ amount: inchesToMm(1 / 8), fromTipIn: 18 }]);
    const none = withoutChange(prepared, one, "tail", 0, IMPERIAL_STEP);
    expect(none.tail).toEqual([{ amount: 0, fromTipIn: null }]);
  });
});
