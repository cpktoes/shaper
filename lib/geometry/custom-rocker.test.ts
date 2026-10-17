import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import type { BlankRecord } from "./blank";
import { prepareBlank, prepareBlankPchip, type PreparedBlank } from "./blank-fit";
import { CATALOG_STATION_LABELS } from "./board-profile";
import {
  bendAt,
  bendPoint,
  isNaturalSpec,
  naturalOf,
  normalizeSpec,
  prepareBoardBlank,
  rockerSpecOf,
  sameRockerSpec,
  withCustomRocker,
  ROCKER_CHANGE_MAX_MM,
  type BlankRockerSpec,
  type RockerChange,
} from "./custom-rocker";
import { pchipMinimum } from "./pchip";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm } from "./units";

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
