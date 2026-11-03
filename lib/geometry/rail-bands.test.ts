/**
 * The RAILS rules — the founder's "Chris Rails v2" sheets (quick 261102-gec, 2026-11-02).
 *
 * Two kinds of test, and never a typed mark (Rule 1, the plan's M12):
 * - GOLDEN PARITY. On the workbook's own two input sets and 1,450 grid cases, every mark and every
 *   drawn line equals the reference page's own number (`__fixtures__/rails-v2-golden.json`, generated
 *   by `scripts/extract-rails-v2-golden.ts` executing `reference/sketches/018-chris-rails-v2.js`).
 * - RULE TESTS. What the sheet leaves out and the app adds — the apex trim, the 1/16" floors, the held
 *   inputs, the nudges, Single Tuck and Hard Edge — proven by relations between the app's own numbers.
 *   The only typed figures are the founder's own rule constants (1/16", 0.577, 0.35, the windows, 75%).
 *
 * The prototype's rails golden (`prototype-rails-golden.json`) is no longer tested here: the prototype's
 * rules are retired on this branch. That fixture and its generator stay because the VOLUME estimator's
 * own golden generator reads it (PC9).
 */
import { describe, expect, it } from "vitest";
import { railCutFoam, type RailCutLine } from "./finished-rail";
import {
  DECK_PERCENT_MIN,
  DEFAULT_RAIL_BAND_SPEC,
  DEFAULT_TIP_RAIL_SCALE,
  MIN_BOTTOM_TUCK_SEPARATION_IN,
  MIN_RAIL_MARK_IN,
  RAIL_DATA_LABEL_ORDER,
  RAIL_NUDGE_KEYS,
  RAIL_NUDGE_LIMIT_IN,
  RAIL_NUDGE_NAMES,
  RAIL_NUDGE_STEP_IN,
  RAIL_RATIO_RANGE,
  RAIL_SCALE_RANGE,
  ZERO_RAIL_NUDGES,
  computeRailBands,
  computeRailSectionOutput,
  deckProfileSliderStep,
  defaultRailAdvanced,
  effectiveDeckPercent,
  mergeRailDataTable,
  railFamilyLabel,
  railNudgesOf,
  railPlotBounds,
  railPlotDots,
  type RailFamily,
  type RailMarkNudges,
  type RailNudgeKey,
  type RailSectionKey,
  type RailSectionOutput,
  type RailSectionSpec,
} from "./rail-bands";
import golden from "./__fixtures__/rails-v2-golden.json";
import { FOIL_THICKNESS_RANGE_IN } from "./foil";
import { measureSlider } from "./measure-display";
import { BOARD_PRESETS } from "./presets";
import { type Mm, inchesToMm, mm, mmToInches, roundToSixteenthInch } from "./units";

const TOL_IN = 1e-9;
const MIN = MIN_RAIL_MARK_IN;

interface GoldenInput {
  T: number;
  deck: number;
  F: number;
  top: number;
  sym: boolean;
  scale: number;
}
interface GoldenEntry {
  input: GoldenInput;
  sheet: Record<string, number | boolean>;
  segments: { key: string; p1: number[]; p2: number[] }[];
}

const workbook = golden.workbook as unknown as (GoldenEntry & { key: string })[];
const cases = golden.cases as unknown as GoldenEntry[];
const everyEntry: GoldenEntry[] = [...workbook, ...cases];

const inch = (v: Mm) => mmToInches(v);

function nudgesIn(partial: Partial<Record<RailNudgeKey, number>> = {}): RailMarkNudges {
  return Object.fromEntries(RAIL_NUDGE_KEYS.map((k) => [k, inchesToMm(partial[k] ?? 0)])) as RailMarkNudges;
}

/** A rail section spec from a golden input set, every nudge 0 and the legacy keys at their defaults. */
function specFor(input: GoldenInput, extra: Partial<RailSectionSpec> = {}): RailSectionSpec {
  return {
    boardThickness: inchesToMm(input.T),
    deckPercent: input.deck,
    family: input.F as RailFamily,
    ratioTopPercent: input.top,
    symmetrical: input.sym,
    cornerCutOffsetOverride: null,
    removeCornerCut: false,
    singleTuck: false,
    bottomTuck3Override: null,
    scaleFromCenter: input.scale,
    nudges: ZERO_RAIL_NUDGES,
    ...extra,
  };
}

/** The centre always reads scale 1 (R10), so a golden case at scale 1 is built as the centre and any
 * other scale as the nose. */
const keyFor = (input: GoldenInput): RailSectionKey => (input.scale === 1 ? "center" : "nose");

function outputFor(input: GoldenInput, extra: Partial<RailSectionSpec> = {}, hardEdge = false): RailSectionOutput {
  return computeRailSectionOutput(keyFor(input), specFor(input, extra), hardEdge);
}

/** The app's section key for each of the page's drawn lines. */
const SEGMENT_KEY: Record<string, string> = {
  domed: "domedBand",
  band1: "band1",
  band2: "band2",
  tuck1: "tuck1",
  tuck2: "tuck2",
};

const RESULT_FIELDS: [keyof RailSectionOutput["result"], string][] = [
  ["thickness", "t"],
  ["boardThickness", "bt"],
  ["apexLenRange", "apexLen"],
  ["apexCenter", "apexCenter"],
  ["railMark1", "rm1"],
  ["railTuck1", "rt1"],
  ["domedDeckBand", "domeBand"],
  ["deckMark1", "dm1"],
  ["deckMark2", "dm2"],
  ["deckMark3", "dm3"],
  ["bottomTuck1", "bt1"],
  ["bottomTuck2", "bt2"],
  ["bottomTuck3", "bt3"],
];

describe("computeRailSectionOutput — golden parity with the founder's reference page", () => {
  it("records what the fixture says it does: the workbook's three sets, 1,450 grid cases, 33 finished curves", () => {
    expect(workbook.map((w) => w.key)).toEqual(["nose", "center", "tail"]);
    expect(cases.length).toBe(1450);
    expect(golden.halfwaySkipped).toBe(180);
    expect(golden.finished.length).toBe(33);
  });

  it("works out every mark and every drawn line exactly as the page does, on every recorded set", () => {
    for (const entry of everyEntry) {
      const output = outputFor(entry.input);
      const r = output.result;
      const label = JSON.stringify(entry.input);
      for (const [field, sheetField] of RESULT_FIELDS) {
        const actual = inch(r[field] as Mm);
        expect(Math.abs(actual - (entry.sheet[sheetField] as number)), `${label} ${field}`).toBeLessThan(TOL_IN);
      }
      expect(Math.abs(inch(output.railThicknessClamped) - (entry.sheet.rail as number)), `${label} rail`).toBeLessThan(TOL_IN);
      expect(output.domed, label).toBe(entry.sheet.domed);
      expect(r.apexTrimmed, label).toBe(false);
      for (const seg of entry.segments) {
        const mine = output.segments.find((s) => s.key === SEGMENT_KEY[seg.key]);
        expect(mine, `${label} ${seg.key}`).toBeDefined();
        const ends = [
          [inch(mine!.p1.x), seg.p1[0]],
          [inch(mine!.p1.y), seg.p1[1]],
          [inch(mine!.p2.x), seg.p2[0]],
          [inch(mine!.p2.y), seg.p2[1]],
        ];
        for (const [a, b] of ends) expect(Math.abs(a - b), `${label} ${seg.key}`).toBeLessThan(TOL_IN);
      }
    }
  }, 30_000);
});

/** Rule 3 worked out in the test from the same inputs (the founder's own figures: 0.125, 1.375, 0.35,
 * 1/16"), so the expected apex is a relation, never a typed number. */
function expectedApex(r: RailSectionOutput["result"], family: number, nudgeIn: number) {
  const t = inch(r.thickness);
  const ac = inch(r.apexCenter);
  const formula = (-0.125 * family + 1.375) * t * 0.35 * r.scale;
  const wanted = Math.max(formula + nudgeIn, MIN);
  const room = Math.max(0, Math.min(2 * (ac - MIN), 2 * (t - MIN - ac)));
  return { apex: Math.min(wanted, room), trimmed: wanted > room + 1e-9 };
}

const RATIOS_IN_HALVES = Array.from(
  { length: (RAIL_RATIO_RANGE.max - RAIL_RATIO_RANGE.min) / RAIL_RATIO_RANGE.step + 1 },
  (_, i) => RAIL_RATIO_RANGE.min + i * RAIL_RATIO_RANGE.step,
);
const FAMILIES: RailFamily[] = [1, 2, 3, 4, 5];

describe("the apex trim (R4) — the apex always fits on the rail", () => {
  const thicknesses: { key: RailSectionKey; T: Mm }[] = [
    { key: "nose", T: DEFAULT_RAIL_BAND_SPEC.nose.boardThickness },
    { key: "center", T: DEFAULT_RAIL_BAND_SPEC.center.boardThickness },
    { key: "tail", T: DEFAULT_RAIL_BAND_SPEC.tail.boardThickness },
    ...[...new Set(cases.map((c) => c.input.T))].map((T) => ({ key: "nose" as const, T: inchesToMm(T) })),
  ];

  it("on every Ratio in halves, every Family, the default and golden thicknesses and both scales, the apex is the formula trimmed to the room, centred on the Apex Center", () => {
    // Over 75,000 sections: every miss is collected and asserted once, so the sweep stays fast.
    const misses: string[] = [];
    let checked = 0;
    for (const { key, T } of thicknesses) {
      for (const scaleFromCenter of [DEFAULT_TIP_RAIL_SCALE, 1]) {
        for (const deckPercent of [100, 87.5, DECK_PERCENT_MIN]) {
          for (const family of FAMILIES) {
            for (const ratioTopPercent of RATIOS_IN_HALVES) {
              for (const apexNudge of [0, -RAIL_NUDGE_LIMIT_IN.apexThickness, RAIL_NUDGE_LIMIT_IN.apexThickness]) {
                const spec: RailSectionSpec = {
                  ...DEFAULT_RAIL_BAND_SPEC[key],
                  boardThickness: T,
                  deckPercent,
                  family,
                  ratioTopPercent,
                  scaleFromCenter,
                  nudges: nudgesIn({ apexThickness: apexNudge }),
                };
                const r = computeRailSectionOutput(key, spec, false).result;
                const t = inch(r.thickness);
                const want = expectedApex(r, family, apexNudge);
                const label = `${key} T${inch(T)} s${scaleFromCenter} d${deckPercent} F${family} r${ratioTopPercent} n${apexNudge}`;
                if (inch(r.railTuck1) < MIN - TOL_IN) misses.push(`${label}: Rail Tuck 1 under 1/16"`);
                if (inch(r.railMark1) > t - MIN + TOL_IN) misses.push(`${label}: Rail Mark 1 over t - 1/16"`);
                if (Math.abs((inch(r.railMark1) + inch(r.railTuck1)) / 2 - inch(r.apexCenter)) > TOL_IN) misses.push(`${label}: not centred`);
                if (Math.abs(inch(r.apexCenter) - t * (1 - ratioTopPercent / 100)) > TOL_IN) misses.push(`${label}: Apex Center`);
                if (Math.abs(inch(r.apexLenRange) - want.apex) > TOL_IN) misses.push(`${label}: apex ${inch(r.apexLenRange)} vs ${want.apex}`);
                if (r.apexTrimmed !== want.trimmed) misses.push(`${label}: trimmed ${r.apexTrimmed}`);
                checked++;
              }
            }
          }
        }
      }
    }
    expect(misses).toEqual([]);
    expect(checked).toBe(thicknesses.length * 2 * 3 * FAMILIES.length * RATIOS_IN_HALVES.length * 3);
  }, 30_000);

  it("Family 1 at 80/20 and at 20/80 is trimmed on all three default rails; the centre at Family 3, 80/20 lands exactly on the room and is not", () => {
    for (const key of ["nose", "center", "tail"] as const) {
      for (const ratioTopPercent of [RAIL_RATIO_RANGE.min, RAIL_RATIO_RANGE.max]) {
        const spec = { ...DEFAULT_RAIL_BAND_SPEC[key], family: 1 as RailFamily, ratioTopPercent };
        expect(computeRailSectionOutput(key, spec, false).result.apexTrimmed, `${key} ${ratioTopPercent}`).toBe(true);
      }
    }
    const edge = computeRailSectionOutput(
      "center",
      { ...DEFAULT_RAIL_BAND_SPEC.center, family: 3, ratioTopPercent: RAIL_RATIO_RANGE.max },
      false,
    ).result;
    expect(edge.apexTrimmed).toBe(false);
    const ac = inch(edge.apexCenter);
    expect(Math.abs(inch(edge.apexLenRange) - 2 * (ac - MIN))).toBeLessThan(TOL_IN);
  });
});

describe("nudges (PC1, rule 8) — each mark moves by its own nudge, and its dependants follow", () => {
  const center = workbook.find((w) => w.key === "center")!.input;
  const base = outputFor(center).result;
  const STEP = 1 / 16;
  const moved = (n: Partial<Record<RailNudgeKey, number>>, sym = false) =>
    outputFor({ ...center, sym }, { nudges: nudgesIn(n) }).result;
  const d = (a: Mm, b: Mm) => inch(a) - inch(b);

  it("is guard-free at the workbook's centre set, so every move below is the rule alone", () => {
    expect(base.apexTrimmed).toBe(false);
  });

  for (const sign of [1, -1]) {
    it(`${sign > 0 ? "+" : "-"}1/16": every nudge moves its own mark by exactly that step`, () => {
      const s = sign * STEP;
      const own: [RailNudgeKey, keyof typeof base][] = [
        ["apexThickness", "apexLenRange"],
        ["deckMark1", "deckMark1"],
        ["deckMark3", "deckMark3"],
        ["domedDeckBand", "domedDeckBand"],
        ["bottomTuck1", "bottomTuck1"],
        ["bottomTuck3", "bottomTuck3"],
      ];
      for (const [key, field] of own) {
        expect(Math.abs(d(moved({ [key]: s })[field] as Mm, base[field] as Mm) - s), key).toBeLessThan(TOL_IN);
      }
    });

    it(`${sign > 0 ? "+" : "-"}1/16": Deck Mark 2 follows half the nudged Deck Mark 1, and the apex nudge carries through the tucks`, () => {
      const s = sign * STEP;
      const dm = moved({ deckMark1: s });
      expect(Math.abs(inch(dm.deckMark2) - inch(dm.deckMark1) / 2)).toBeLessThan(TOL_IN);
      const ap = moved({ apexThickness: s });
      expect(Math.abs(d(ap.railMark1, base.railMark1) - s / 2)).toBeLessThan(TOL_IN);
      expect(Math.abs(d(ap.railTuck1, base.railTuck1) + s / 2)).toBeLessThan(TOL_IN);
      expect(Math.abs(d(ap.apexCenter, base.apexCenter))).toBeLessThan(TOL_IN);
      expect(Math.abs(inch(ap.bottomTuck1) - inch(ap.railTuck1) * 0.577)).toBeLessThan(TOL_IN);
      expect(Math.abs(d(ap.bottomTuck3, ap.railTuck1))).toBeLessThan(TOL_IN);
      expect(Math.abs(d(ap.bottomTuck3, base.bottomTuck3) + s / 2)).toBeLessThan(TOL_IN);
    });

    it(`${sign > 0 ? "+" : "-"}1/16": with Sym on, Bottom Tuck 1 follows the nudged Deck Mark 1 and Bottom Tuck 3 the nudged Deck Mark 3`, () => {
      const s = sign * STEP;
      const a = moved({ deckMark1: s, deckMark3: s }, true);
      expect(Math.abs(d(a.bottomTuck1, a.deckMark1))).toBeLessThan(TOL_IN);
      expect(Math.abs(d(a.bottomTuck3, a.deckMark3))).toBeLessThan(TOL_IN);
    });
  }

  // Plan 04 (R17, 2026-11-02): Deck Mark 2 and Bottom Tuck 2 have no nudge of their own — "Always in the
  // middle is great". Each is exactly half its (nudged) parent mark, and Band 2 and Tuck 2 start on their
  // parent band's midpoint.
  it("Deck Mark 2 and Bottom Tuck 2 are always half the nudged Deck Mark 1 and Bottom Tuck 1, and Band 2 and Tuck 2 start at their band's midpoint", () => {
    for (const s of [STEP, -STEP]) {
      const output = outputFor(center, { nudges: nudgesIn({ deckMark1: s, bottomTuck1: s }) });
      const r = output.result;
      expect(Math.abs(d(r.deckMark1, base.deckMark1) - s)).toBeLessThan(TOL_IN);
      expect(Math.abs(d(r.bottomTuck1, base.bottomTuck1) - s)).toBeLessThan(TOL_IN);
      expect(Math.abs(inch(r.deckMark2) - inch(r.deckMark1) / 2)).toBeLessThan(TOL_IN);
      expect(Math.abs(inch(r.bottomTuck2) - inch(r.bottomTuck1) / 2)).toBeLessThan(TOL_IN);
      const seg = (k: string) => output.segments.find((x) => x.key === k)!;
      const onLine = (a: { x: Mm; y: Mm }, b: { x: Mm; y: Mm }, p: { x: Mm; y: Mm }) =>
        (inch(b.x) - inch(a.x)) * (inch(p.y) - inch(a.y)) - (inch(b.y) - inch(a.y)) * (inch(p.x) - inch(a.x));
      expect(Math.abs(onLine(seg("band1").p1, seg("band1").p2, seg("band2").p1))).toBeLessThan(TOL_IN);
      expect(Math.abs(onLine(seg("tuck1").p1, seg("tuck1").p2, seg("tuck2").p1))).toBeLessThan(TOL_IN);
      expect(Math.abs(inch(seg("band2").p1.x) + inch(r.deckMark2))).toBeLessThan(TOL_IN);
      expect(Math.abs(inch(seg("tuck2").p1.x) + inch(r.bottomTuck2))).toBeLessThan(TOL_IN);
      // The page's own midpoints: half Band 1's rise and half Rail Tuck 1.
      const band1 = seg("band1");
      expect(Math.abs(inch(seg("band2").p1.y) - (inch(band1.p1.y) + inch(band1.p2.y)) / 2)).toBeLessThan(TOL_IN);
      expect(Math.abs(inch(seg("tuck2").p1.y) - inch(r.railTuck1) / 2)).toBeLessThan(TOL_IN);
    }
  });

  it("a board carrying retired Deck Mark 2 and Bottom Tuck 2 amounts draws exactly as one without them (R17)", () => {
    for (const s of [STEP, -STEP, 0.25]) {
      const plain = nudgesIn({ deckMark1: s });
      const retired = { ...plain, deckMark2: inchesToMm(s), bottomTuck2: inchesToMm(-s) } as unknown as RailMarkNudges;
      expect(outputFor(center, { nudges: retired })).toEqual(outputFor(center, { nudges: plain }));
    }
  });
});

describe("the floors (R9, PC3-PC5) — no mark is ever nonsense, whatever the nudges", () => {
  it("with every nudge at its window's ends in every combination, on thin and thick rails at both Ratio ends", () => {
    // Over 12,000 sections: every miss is collected and asserted once, so the sweep stays fast.
    const misses: string[] = [];
    let checked = 0;
    const signCombos = Array.from({ length: 1 << RAIL_NUDGE_KEYS.length }, (_, mask) =>
      Object.fromEntries(
        RAIL_NUDGE_KEYS.map((k, i) => [k, ((mask >> i) & 1 ? 1 : -1) * RAIL_NUDGE_LIMIT_IN[k]]),
      ) as Record<RailNudgeKey, number>,
    );
    for (const T of [DEFAULT_RAIL_BAND_SPEC.nose.boardThickness, inchesToMm(1), inchesToMm(3.5)]) {
      for (const deckPercent of [100, DECK_PERCENT_MIN]) {
        for (const ratioTopPercent of [RAIL_RATIO_RANGE.min, RAIL_RATIO_RANGE.max]) {
          for (const family of [1, 5] as RailFamily[]) {
            for (const symmetrical of [false, true]) {
              for (const singleTuck of [false, true]) {
                for (const n of signCombos) {
                  const spec: RailSectionSpec = {
                    ...DEFAULT_RAIL_BAND_SPEC.nose,
                    boardThickness: T,
                    deckPercent,
                    ratioTopPercent,
                    family,
                    symmetrical,
                    singleTuck,
                    nudges: nudgesIn(n),
                  };
                  const r = computeRailSectionOutput("nose", spec, false).result;
                  const label = `T${inch(T)} d${deckPercent} r${ratioTopPercent} F${family} sym${symmetrical} st${singleTuck} ${JSON.stringify(n)}`;
                  for (const f of ["apexLenRange", "railTuck1", "deckMark1", "deckMark2", "deckMark3", "bottomTuck1", "bottomTuck2", "bottomTuck3"] as const) {
                    if (inch(r[f]) < MIN - TOL_IN) misses.push(`${label}: ${f} under 1/16"`);
                  }
                  const dm1 = inch(r.deckMark1);
                  const bt1 = inch(r.bottomTuck1);
                  if (inch(r.deckMark2) > dm1 + TOL_IN) misses.push(`${label}: Deck Mark 2 past Deck Mark 1`);
                  if (inch(r.bottomTuck2) > bt1 + TOL_IN) misses.push(`${label}: Bottom Tuck 2 past Bottom Tuck 1`);
                  if (dm1 >= 2 * MIN && inch(r.deckMark2) > dm1 - MIN + TOL_IN) misses.push(`${label}: Deck Mark 2 not 1/16" inside`);
                  if (bt1 >= 2 * MIN && inch(r.bottomTuck2) > bt1 - MIN + TOL_IN) misses.push(`${label}: Bottom Tuck 2 not 1/16" inside`);
                  if (inch(r.deckMark3) < dm1 + MIN - TOL_IN) misses.push(`${label}: Deck Mark 3 within 1/16" of Deck Mark 1`);
                  if (inch(r.bottomTuck3) < bt1 + MIN_BOTTOM_TUCK_SEPARATION_IN - TOL_IN) misses.push(`${label}: Bottom Tuck 3 separation`);
                  // R18, the founder's final ruling: "never let it equal Deck Mark 3" — at least 1/16" past it.
                  if (inch(r.domedDeckBand) < inch(r.deckMark3) + MIN - TOL_IN) misses.push(`${label}: Domed Deck Band within 1/16" of Deck Mark 3`);
                  if (r.domedDeckBand === r.deckMark3) misses.push(`${label}: Domed Deck Band on Deck Mark 3`);
                  checked++;
                }
              }
            }
          }
        }
      }
    }
    expect(misses).toEqual([]);
    expect(checked).toBe(3 * 2 * 2 * 2 * 2 * 2 * signCombos.length);
  }, 30_000);
});

describe("held inputs (R7, PC6) — a stored value outside its window draws at the window's edge, and is never rewritten", () => {
  const nose = DEFAULT_RAIL_BAND_SPEC.nose;
  // "The same drawing" to a hair, not bit for bit: a window's edge reached by clamping a stored 5" and
  // the edge passed in directly can differ in the last digit, because an inch that is not exact in
  // binary once it has been through millimetres (3/4" comes back as 0.7499999999999999, where 1/4",
  // 1/2" and 2" come back exactly) — fast task 188, when Bottom Tuck 3's window grew to ±3/4". Every
  // number is rounded to nine decimals (a millionth of a millimetre) before the two are compared.
  const snap = (value: unknown) =>
    JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === "number" ? Number(v.toFixed(9)) : v)));
  const same = (a: RailSectionOutput, b: RailSectionOutput) => expect(snap(a)).toEqual(snap(b));

  it("Deck Profile 66 computes exactly as 75, and the spec passed in is not changed", () => {
    const spec: RailSectionSpec = { ...nose, deckPercent: 66 };
    const before = structuredClone(spec);
    same(computeRailSectionOutput("nose", spec, false), computeRailSectionOutput("nose", { ...nose, deckPercent: DECK_PERCENT_MIN }, false));
    expect(spec).toEqual(before);
    expect(effectiveDeckPercent(66)).toBe(DECK_PERCENT_MIN);
    expect(effectiveDeckPercent(100)).toBe(100);
  });

  it("Ratio 10 as 20 and 90 as 80", () => {
    same(computeRailSectionOutput("nose", { ...nose, ratioTopPercent: 10 }, false), computeRailSectionOutput("nose", { ...nose, ratioTopPercent: RAIL_RATIO_RANGE.min }, false));
    same(computeRailSectionOutput("nose", { ...nose, ratioTopPercent: 90 }, false), computeRailSectionOutput("nose", { ...nose, ratioTopPercent: RAIL_RATIO_RANGE.max }, false));
  });

  it("a tip's scale 0.2 as 0.5, a nudge of 5\" as its window's end, and the centre ignores a stored scale of 0.6", () => {
    same(computeRailSectionOutput("nose", { ...nose, scaleFromCenter: 0.2 }, false), computeRailSectionOutput("nose", { ...nose, scaleFromCenter: RAIL_SCALE_RANGE.min }, false));
    for (const key of RAIL_NUDGE_KEYS) {
      same(
        computeRailSectionOutput("nose", { ...nose, nudges: nudgesIn({ [key]: 5 }) }, false),
        computeRailSectionOutput("nose", { ...nose, nudges: nudgesIn({ [key]: RAIL_NUDGE_LIMIT_IN[key] }) }, false),
      );
    }
    const center = DEFAULT_RAIL_BAND_SPEC.center;
    same(computeRailSectionOutput("center", { ...center, scaleFromCenter: 0.6 }, false), computeRailSectionOutput("center", center, false));
    expect(computeRailSectionOutput("center", { ...center, scaleFromCenter: 0.6 }, false).result.scale).toBe(1);
  });
});

describe("the scale (R10) — scales the apex, Deck Mark 1 and Deck Mark 3, never the dome", () => {
  // The Domed Deck Band is never multiplied by the scale — neither its 2.4 x T nor its own nudge (plan 04,
  // R18): the dome-nudge tests below move the nose's dome by the same inches as the centre's.
  it("on every guard-free golden pair, the marks at scale s are s times their value at scale 1", () => {
    let pairs = 0;
    const withoutScale = (input: GoldenInput) => JSON.stringify({ ...input, scale: 0 });
    const atScaleOne = new Map(cases.filter((c) => c.input.scale === 1).map((c) => [withoutScale(c.input), c]));
    for (const entry of cases) {
      if (entry.input.scale === 1) continue;
      const atOne = atScaleOne.get(withoutScale(entry.input));
      if (!atOne) continue;
      pairs++;
      const s = entry.input.scale;
      const a = outputFor(entry.input).result;
      const b = outputFor(atOne.input).result;
      expect(Math.abs(inch(a.apexLenRange) - s * inch(b.apexLenRange))).toBeLessThan(TOL_IN);
      expect(Math.abs(inch(a.deckMark1) - s * inch(b.deckMark1))).toBeLessThan(TOL_IN);
      expect(Math.abs(inch(a.deckMark3) - s * inch(b.deckMark3))).toBeLessThan(TOL_IN);
      expect(Math.abs(inch(a.deckMark2) - inch(a.deckMark1) / 2)).toBeLessThan(TOL_IN);
      expect(inch(a.domedDeckBand)).toBe(inch(b.domedDeckBand));
    }
    expect(pairs).toBeGreaterThan(0);
  }, 30_000);
});

describe("the Domed Deck Band nudge (quick 261102-gec plan 04, R18) — ±2\", never onto Deck Mark 3", () => {
  // The engine's own path for an un-nudged dome: 2.4 x T in inches, back to millimetres. The founder's
  // figures are the only typed ones: 2.4, 1/16" (MIN_RAIL_MARK_IN) and the ±2" window.
  const formulaDome = (spec: RailSectionSpec) => inchesToMm(2.4 * mmToInches(spec.boardThickness));
  const ONE_INCH = 1;
  const DOME_LIMIT = RAIL_NUDGE_LIMIT_IN.domedDeckBand;
  const d = (a: Mm, b: Mm) => inch(a) - inch(b);

  it("un-nudged, every golden entry's dome is exactly 2.4 x T — the guard never reaches the sheet's numbers (PC27, M15)", () => {
    for (const entry of everyEntry) {
      const spec = specFor(entry.input);
      const r = computeRailSectionOutput(keyFor(entry.input), spec, false).result;
      expect(r.domedDeckBand, JSON.stringify(entry.input)).toBe(formulaDome(spec));
      expect(Math.abs(inch(r.domedDeckBand) - (entry.sheet.domeBand as number))).toBeLessThan(TOL_IN);
    }
  }, 30_000);

  it("un-nudged at the thinnest section the app carries (the foil's 1/4\" floor), every scale step, both Ratio ends, Family 1 and 5: exactly 2.4 x T", () => {
    const thinnest = inchesToMm(FOIL_THICKNESS_RANGE_IN.min);
    const steps = Math.round((RAIL_SCALE_RANGE.max - RAIL_SCALE_RANGE.min) / RAIL_SCALE_RANGE.step);
    let checked = 0;
    for (let i = 0; i <= steps; i++) {
      const scaleFromCenter = RAIL_SCALE_RANGE.min + i * RAIL_SCALE_RANGE.step;
      for (const ratioTopPercent of [RAIL_RATIO_RANGE.min, RAIL_RATIO_RANGE.max]) {
        for (const family of [1, 5] as RailFamily[]) {
          for (const symmetrical of [false, true]) {
            for (const deckPercent of [100, DECK_PERCENT_MIN]) {
              const spec: RailSectionSpec = {
                ...DEFAULT_RAIL_BAND_SPEC.nose,
                boardThickness: thinnest,
                scaleFromCenter,
                ratioTopPercent,
                family,
                symmetrical,
                deckPercent,
              };
              const r = computeRailSectionOutput("nose", spec, false).result;
              expect(r.domedDeckBand, `s${scaleFromCenter} r${ratioTopPercent} F${family}`).toBe(formulaDome(spec));
              expect(inch(r.domedDeckBand)).toBeGreaterThan(inch(r.deckMark3) + MIN);
              checked++;
            }
          }
        }
      }
    }
    expect(checked).toBe((steps + 1) * 2 * 2 * 2 * 2);
  });

  it("+1\" moves the dome exactly 1\" on the first board's three rails and on every golden case, at any scale", () => {
    for (const key of ["nose", "center", "tail"] as const) {
      const spec = DEFAULT_RAIL_BAND_SPEC[key];
      const a = computeRailSectionOutput(key, spec, false).result;
      const b = computeRailSectionOutput(key, { ...spec, nudges: nudgesIn({ domedDeckBand: ONE_INCH }) }, false).result;
      expect(Math.abs(d(b.domedDeckBand, a.domedDeckBand) - ONE_INCH), key).toBeLessThan(TOL_IN);
    }
    for (const entry of cases) {
      const a = outputFor(entry.input).result;
      const b = outputFor(entry.input, { nudges: nudgesIn({ domedDeckBand: ONE_INCH }) }).result;
      expect(Math.abs(d(b.domedDeckBand, a.domedDeckBand) - ONE_INCH), JSON.stringify(entry.input)).toBeLessThan(TOL_IN);
    }
    // The nose's dome moves the same inches as the centre's, whatever the nose's scale.
    for (const scaleFromCenter of [RAIL_SCALE_RANGE.min, DEFAULT_TIP_RAIL_SCALE, RAIL_SCALE_RANGE.max]) {
      const spec = { ...DEFAULT_RAIL_BAND_SPEC.nose, scaleFromCenter };
      const a = computeRailSectionOutput("nose", spec, false).result;
      const b = computeRailSectionOutput("nose", { ...spec, nudges: nudgesIn({ domedDeckBand: ONE_INCH }) }, false).result;
      expect(Math.abs(d(b.domedDeckBand, a.domedDeckBand) - ONE_INCH)).toBeLessThan(TOL_IN);
    }
  }, 30_000);

  it("always equals max(2.4 x T + its nudge, Deck Mark 3 + 1/16\"), across the whole window and Deck Mark 3's", () => {
    const sixteenths = Math.round(DOME_LIMIT / RAIL_NUDGE_STEP_IN);
    for (const key of ["nose", "center", "tail"] as const) {
      for (const dm3 of [-RAIL_NUDGE_LIMIT_IN.deckMark3, 0, RAIL_NUDGE_LIMIT_IN.deckMark3]) {
        for (let i = -sixteenths; i <= sixteenths; i++) {
          const dome = i * RAIL_NUDGE_STEP_IN;
          const spec = { ...DEFAULT_RAIL_BAND_SPEC[key], nudges: nudgesIn({ deckMark3: dm3, domedDeckBand: dome }) };
          const r = computeRailSectionOutput(key, spec, false).result;
          const want = Math.max(2.4 * inch(r.boardThickness) + dome, inch(r.deckMark3) + MIN);
          expect(Math.abs(inch(r.domedDeckBand) - want), `${key} dm3 ${dm3} dome ${dome}`).toBeLessThan(TOL_IN);
          expect(r.domedDeckBand).not.toBe(r.deckMark3);
        }
      }
    }
  });

  it("never onto Deck Mark 3: on the first board's centre, the dome at -2\" sits exactly 1/16\" past Deck Mark 3, wherever Deck Mark 3 is nudged", () => {
    const spec = DEFAULT_RAIL_BAND_SPEC.center;
    for (const dm3 of [-RAIL_NUDGE_LIMIT_IN.deckMark3, 0, RAIL_NUDGE_LIMIT_IN.deckMark3]) {
      const r = computeRailSectionOutput(
        "center",
        { ...spec, nudges: nudgesIn({ deckMark3: dm3, domedDeckBand: -DOME_LIMIT }) },
        false,
      ).result;
      // Held: the formula alone would land inside Deck Mark 3 + 1/16".
      expect(2.4 * inch(r.boardThickness) - DOME_LIMIT).toBeLessThan(inch(r.deckMark3) + MIN);
      expect(Math.abs(d(r.domedDeckBand, r.deckMark3) - MIN), `dm3 ${dm3}`).toBeLessThan(TOL_IN);
      expect(r.domedDeckBand).toBeGreaterThan(r.deckMark3);
    }
  });

  it("on a domed deck the deck line rides the moved dome: Band 1's and Band 2's deck ends drop onto it, at unchanged x", () => {
    const spec = { ...DEFAULT_RAIL_BAND_SPEC.center, deckPercent: DECK_PERCENT_MIN };
    const a = computeRailSectionOutput("center", spec, false);
    const b = computeRailSectionOutput("center", { ...spec, nudges: nudgesIn({ domedDeckBand: ONE_INCH }) }, false);
    expect(b.domed).toBe(true);
    const r = b.result;
    const t = inch(r.thickness);
    const T = inch(r.boardThickness);
    const deckY = (mark: Mm) => t + (T - t) * Math.min(1, inch(mark) / inch(r.domedDeckBand));
    const seg = (o: RailSectionOutput, k: string) => o.segments.find((x) => x.key === k)!;
    expect(Math.abs(inch(seg(b, "band1").p2.y) - deckY(r.deckMark1))).toBeLessThan(TOL_IN);
    expect(Math.abs(inch(seg(b, "band2").p2.y) - deckY(r.deckMark3))).toBeLessThan(TOL_IN);
    expect(seg(b, "band1").p2.y).toBeLessThan(seg(a, "band1").p2.y);
    expect(seg(b, "band2").p2.y).toBeLessThan(seg(a, "band2").p2.y);
    expect(seg(b, "band1").p2.x).toBe(seg(a, "band1").p2.x);
    expect(seg(b, "band2").p2.x).toBe(seg(a, "band2").p2.x);
  });

  it("on a flat deck only the dome's own line end, the Board Thickness connector, the bottom connector's start and the drawing's left edge move", () => {
    for (const nudge of [ONE_INCH, -RAIL_NUDGE_STEP_IN]) {
      const spec = { ...DEFAULT_RAIL_BAND_SPEC.center, deckPercent: 100 };
      const a = computeRailSectionOutput("center", spec, false);
      const b = computeRailSectionOutput("center", { ...spec, nudges: nudgesIn({ domedDeckBand: nudge }) }, false);
      expect(b.domed).toBe(false);
      const seg = (o: RailSectionOutput, k: string) => o.segments.find((x) => x.key === k)!;
      for (const k of ["band1", "band2", "tuck1", "tuck2", "railConn"]) expect(seg(b, k), k).toEqual(seg(a, k));
      expect(b.dataGroups).toEqual(a.dataGroups);
      const moved = (x: Mm, y: Mm) => Math.abs(inch(x) - inch(y) + nudge);
      expect(moved(seg(b, "domedBand").p2.x, seg(a, "domedBand").p2.x)).toBeLessThan(TOL_IN);
      expect(seg(b, "domedBand").p1).toEqual(seg(a, "domedBand").p1);
      expect(moved(seg(b, "boardConn").p1.x, seg(a, "boardConn").p1.x)).toBeLessThan(TOL_IN);
      expect(moved(seg(b, "boardConn").p2.x, seg(a, "boardConn").p2.x)).toBeLessThan(TOL_IN);
      expect(moved(seg(b, "bottomConn").p1.x, seg(a, "bottomConn").p1.x)).toBeLessThan(TOL_IN);
      expect(seg(b, "bottomConn").p2).toEqual(seg(a, "bottomConn").p2);
      expect(moved(railPlotBounds(b.result).xAxisMin, railPlotBounds(a.result).xAxisMin)).toBeLessThan(TOL_IN);
    }
  });

  it("the slider's window: ±2\" in 1/16\" steps in Imperial, whole millimetres inside ±2\" in Metric (PC34)", () => {
    const window = { min: -DOME_LIMIT, max: DOME_LIMIT };
    const metric = measureSlider(mm(0), window, RAIL_NUDGE_STEP_IN, 1, "metric");
    expect(metric.min).toBe(-Math.floor(inchesToMm(DOME_LIMIT)));
    expect(metric.max).toBe(Math.floor(inchesToMm(DOME_LIMIT)));
    expect(metric.step).toBe(1);
    const imperial = measureSlider(mm(0), window, RAIL_NUDGE_STEP_IN, 1, "imperial");
    expect(imperial.min).toBe(-DOME_LIMIT);
    expect(imperial.max).toBe(DOME_LIMIT);
    expect(imperial.step).toBe(RAIL_NUDGE_STEP_IN);
    // The engine's window is wider than Metric's whole millimetres, so a Metric end is never clamped.
    const spec = DEFAULT_RAIL_BAND_SPEC.center;
    const atMetricEnd = computeRailSectionOutput("center", { ...spec, nudges: { ...ZERO_RAIL_NUDGES, domedDeckBand: mm(metric.max) } }, false).result;
    const base = computeRailSectionOutput("center", spec, false).result;
    expect(Math.abs(atMetricEnd.domedDeckBand - base.domedDeckBand - metric.max)).toBeLessThan(1e-9);
  });
});

describe("railNudgesOf (plan 04, PC29) — exactly the six keys, a missing or non-number nudge reading 0", () => {
  it("keeps finite numbers exactly, reads missing, string, NaN and Infinity as 0, and drops the retired keys", () => {
    const read = railNudgesOf({
      apexThickness: 1.5875,
      deckMark1: "3",
      deckMark3: Number.NaN,
      bottomTuck1: Number.POSITIVE_INFINITY,
      bottomTuck3: -3.175,
      deckMark2: 6.35,
      bottomTuck2: -3.175,
    });
    expect(Object.keys(read)).toEqual([...RAIL_NUDGE_KEYS]);
    expect(read.apexThickness).toBe(1.5875);
    expect(read.bottomTuck3).toBe(-3.175);
    expect(read.deckMark1).toBe(0);
    expect(read.deckMark3).toBe(0);
    expect(read.domedDeckBand).toBe(0);
    expect(read.bottomTuck1).toBe(0);
    expect("deckMark2" in read).toBe(false);
    expect("bottomTuck2" in read).toBe(false);
  });

  it("reads nothing at all as every nudge 0", () => {
    expect(railNudgesOf(undefined)).toEqual(ZERO_RAIL_NUDGES);
    expect(railNudgesOf(null)).toEqual(ZERO_RAIL_NUDGES);
    expect(railNudgesOf({})).toEqual(ZERO_RAIL_NUDGES);
  });

  it("a section whose nudges predate the dome key draws exactly as one with the dome at 0 (Fast Refresh's board in memory)", () => {
    const spec = DEFAULT_RAIL_BAND_SPEC.center;
    const { domedDeckBand: _dome, ...older } = ZERO_RAIL_NUDGES;
    void _dome;
    const out = computeRailSectionOutput("center", { ...spec, nudges: older as RailMarkNudges }, false);
    expect(out).toEqual(computeRailSectionOutput("center", spec, false));
    expect(Number.isFinite(out.result.domedDeckBand)).toBe(true);
  });
});

describe("Single Tuck and Hard Edge (R14) — as before", () => {
  const center = workbook.find((w) => w.key === "center")!.input;
  const bottomLabels = (o: RailSectionOutput) => o.dataGroups.find((g) => g.heading === "Bottom")!.rows.map((r) => r.label);
  const railLabels = (o: RailSectionOutput) => o.dataGroups.find((g) => g.heading === "Rail Side")!.rows.map((r) => r.label);

  it("Single Tuck draws one tuck from Rail Tuck 1 to Bottom Tuck 3, no Tuck 2, and no Bottom Tuck 1 or 2 rows", () => {
    const o = outputFor(center, { singleTuck: true });
    const tuck1 = o.segments.find((s) => s.key === "tuck1")!;
    expect(tuck1.p1.x).toBe(0);
    expect(tuck1.p1.y).toBeCloseTo(o.result.railTuck1, 9);
    expect(tuck1.p2.x).toBeCloseTo(-o.result.bottomTuck3, 9);
    expect(tuck1.p2.y).toBe(0);
    expect(o.segments.some((s) => s.key === "tuck2")).toBe(false);
    expect(bottomLabels(o)).toEqual(["Bottom Tuck 3"]);
  });

  it("a hard edge has Bottom Tuck 3 at 0, a hard-edge line from Rail Tuck 1 to the bottom corner, no Rail Tuck 1 row and the hard-edge cell", () => {
    const o = outputFor(center, {}, true);
    expect(o.result.bottomTuck3).toBe(0);
    const edge = o.segments.find((s) => s.key === "hardEdge")!;
    expect(edge.p1.x).toBe(0);
    expect(edge.p1.y).toBeCloseTo(o.result.railTuck1, 9);
    expect(edge.p2).toEqual({ x: 0, y: 0 });
    expect(o.segments.some((s) => s.key === "tuck1" || s.key === "tuck2")).toBe(false);
    expect(railLabels(o)).not.toContain("Rail Tuck 1");
    expect(o.dataGroups.find((g) => g.heading === "Bottom")!.rows).toEqual([{ label: "Bottom Tuck 3", value: "hard-edge" }]);
  });
});

describe("no Corner Cut anywhere (the founder's v2 sheets have none)", () => {
  it("no segment, DATA label or canonical row names a Corner Cut, on the default board and every preset", () => {
    for (const spec of [DEFAULT_RAIL_BAND_SPEC, ...BOARD_PRESETS.map((p) => p.rails)]) {
      const bands = computeRailBands(spec);
      for (const key of ["nose", "center", "tail"] as const) {
        for (const seg of bands[key].segments) {
          expect(seg.key.toLowerCase()).not.toContain("corner");
          expect(seg.label).not.toMatch(/corner/i);
        }
        for (const g of bands[key].dataGroups) for (const row of g.rows) expect(row.label).not.toMatch(/corner/i);
      }
    }
    for (const labels of Object.values(RAIL_DATA_LABEL_ORDER)) for (const l of labels) expect(l).not.toMatch(/corner/i);
  });
});

describe("the profile is the cut (M7, R5) — volume integrates exactly the foam the cuts leave", () => {
  const shoelace = (pts: [number, number][]) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a) / 2;
  };
  const CUT_KEYS = new Set(["band1", "band2", "tuck1", "tuck2"]);

  it("the profile closed at the drawing's left edge has the same area as the cut foam, across trims, floors, Sym, Single Tuck and Hard Edge", () => {
    const misses: string[] = [];
    let checked = 0;
    for (const T of [1, 1.625, 2.5, 3.5]) {
      for (const deckPercent of [100, 87.5, DECK_PERCENT_MIN]) {
        for (const family of [1, 3, 5] as RailFamily[]) {
          for (let ratioTopPercent = RAIL_RATIO_RANGE.min; ratioTopPercent <= RAIL_RATIO_RANGE.max; ratioTopPercent += 2.5) {
            for (const symmetrical of [false, true]) {
              for (const singleTuck of [false, true]) {
                for (const hardEdge of [false, true]) {
                  for (const scaleFromCenter of [RAIL_SCALE_RANGE.min, 1]) {
                    const o = computeRailSectionOutput(
                      "nose",
                      { ...DEFAULT_RAIL_BAND_SPEC.nose, boardThickness: inchesToMm(T), deckPercent, family, ratioTopPercent, symmetrical, singleTuck, scaleFromCenter },
                      hardEdge,
                    );
                    const x0In = inch(o.bounds.xAxisMin);
                    const TIn = inch(o.boardThickness);
                    const profile: [number, number][] = [[x0In, TIn], ...o.profile.map((p) => [inch(p.x), inch(p.y)] as [number, number]), [x0In, 0]];
                    const cuts: RailCutLine[] = o.segments
                      .filter((s) => CUT_KEYS.has(s.key) || (s.key === "domedBand" && o.domed))
                      .map((s) => ({ p1: s.p1, p2: s.p2 }));
                    const foam = railCutFoam(cuts, o.boardThickness, o.bounds.xAxisMin).map((p) => [inch(p.x), inch(p.y)] as [number, number]);
                    const gap = Math.abs(shoelace(profile) - shoelace(foam));
                    if (gap >= 1e-9) misses.push(`T${T} d${deckPercent} F${family} r${ratioTopPercent} sym${symmetrical} st${singleTuck} he${hardEdge} s${scaleFromCenter}: ${gap}`);
                    checked++;
                  }
                }
              }
            }
          }
        }
      }
    }
    expect(misses).toEqual([]);
    expect(checked).toBeGreaterThan(0);
  }, 30_000);
});

describe("roundToSixteenthInch", () => {
  it("snaps 2.5in x 80% to exactly 2in", () => {
    const snapped = roundToSixteenthInch(inchesToMm(2.5 * 0.8));
    expect(mmToInches(snapped)).toBeCloseTo(2, 9);
  });

  it("snaps 1.31in x 72% to the nearest sixteenth", () => {
    const snapped = roundToSixteenthInch(inchesToMm(1.31 * 0.72));
    expect(mmToInches(snapped)).toBeCloseTo(15 / 16, 9);
  });
});

describe("railFamilyLabel", () => {
  it("names all five families", () => {
    expect(railFamilyLabel(1)).toBe("boxy");
    expect(railFamilyLabel(2)).toBe("boxy/med");
    expect(railFamilyLabel(3)).toBe("med");
    expect(railFamilyLabel(4)).toBe("med/knifey");
    expect(railFamilyLabel(5)).toBe("knifey");
  });
});

describe("mergeRailDataTable", () => {
  it("emits the canonical row order, with no Corner Cut rows, and fills absent cells with null (em dash) regardless of open sections", () => {
    const bands = computeRailBands(DEFAULT_RAIL_BAND_SPEC);

    // Tail defaults to Hard Edge on, so it lacks a "Rail Tuck 1" row and the Bottom Tuck 1/2 rows
    // that nose (hard edge off) carries — mergeRailDataTable must still emit those canonical rows,
    // with the tail's cell filled in as null.
    const merged = mergeRailDataTable([
      { key: "nose", dataGroups: bands.nose.dataGroups },
      { key: "tail", dataGroups: bands.tail.dataGroups },
    ]);

    const railSide = merged.find((g) => g.heading === "Rail Side")!;
    expect(railSide.rows.map((r) => r.label)).toEqual([
      "Board Thickness",
      "Tapered Rail Thickness",
      "Apex Thickness",
      "Apex Center",
      "Rail Mark 1",
      "Rail Tuck 1",
    ]);
    const railTuck1Row = railSide.rows.find((r) => r.label === "Rail Tuck 1")!;
    expect(railTuck1Row.cells[0]).not.toBeNull(); // nose
    expect(railTuck1Row.cells[1]).toBeNull(); // tail (hard edge — no row)

    const deckSide = merged.find((g) => g.heading === "Deck Side")!;
    expect(deckSide.rows.map((r) => r.label)).toEqual(["Domed Deck Band", "Deck Mark 1", "Deck Mark 2", "Deck Mark 3"]);

    const bottom = merged.find((g) => g.heading === "Bottom")!;
    expect(bottom.rows.map((r) => r.label)).toEqual(["Bottom Tuck 1", "Bottom Tuck 2", "Bottom Tuck 3"]);
    const bottomTuck1Row = bottom.rows.find((r) => r.label === "Bottom Tuck 1")!;
    expect(bottomTuck1Row.cells[0]).not.toBeNull(); // nose
    expect(bottomTuck1Row.cells[1]).toBeNull(); // tail (hard edge — no row)
    const bottomTuck3Row = bottom.rows.find((r) => r.label === "Bottom Tuck 3")!;
    expect(bottomTuck3Row.cells[0]).not.toBeNull(); // nose: a real value
    expect(bottomTuck3Row.cells[1]).toBe("hard-edge"); // tail: the hard-edge sentinel
  });
});

describe("buildRailDataGroups row inclusion", () => {
  it("a flat deck carries one Board Thickness row; a domed deck adds the Tapered Rail Thickness and the Domed Deck Band", () => {
    const flat = computeRailSectionOutput("center", DEFAULT_RAIL_BAND_SPEC.center, false).dataGroups;
    const railSide = flat.find((g) => g.heading === "Rail Side")!;
    expect(railSide.rows[0].label).toBe("Board Thickness");
    expect(railSide.rows.filter((r) => r.label === "Board Thickness").length).toBe(1);
    expect(flat.find((g) => g.heading === "Deck Side")!.rows.map((r) => r.label)).not.toContain("Domed Deck Band");

    const domed = computeRailSectionOutput("center", { ...DEFAULT_RAIL_BAND_SPEC.center, deckPercent: DECK_PERCENT_MIN }, false);
    const domedRail = domed.dataGroups.find((g) => g.heading === "Rail Side")!.rows;
    expect(domedRail[0]).toEqual({ label: "Board Thickness", value: domed.boardThickness });
    expect(domedRail[1]).toEqual({ label: "Tapered Rail Thickness", value: domed.result.thickness });
    expect(domed.dataGroups.find((g) => g.heading === "Deck Side")!.rows[0]).toEqual({
      label: "Domed Deck Band",
      value: domed.result.domedDeckBand,
    });
  });
});

describe("railPlotDots — which rail marks get a dot (the RAILS plot and the ☰ RAILS tile)", () => {
  const sections = [
    { name: "default", spec: DEFAULT_RAIL_BAND_SPEC },
    ...BOARD_PRESETS.map((preset) => ({ name: preset.id, spec: preset.rails })),
  ].flatMap(({ name, spec }) => {
    const bands = computeRailBands(spec);
    return (["nose", "center", "tail"] as const).map((key) => ({ label: `${name} ${key}`, output: bands[key] }));
  });

  for (const { label, output } of sections) {
    it(`${label}: band ends in plot order, then the apex centre, then the dome's top`, () => {
      const { segments, result, domed } = output;
      const dots = railPlotDots(segments, result, domed);
      const noDot = new Set(["boardConn", "bottomConn", "railConn", ...(result.hardEdge ? ["hardEdge"] : [])]);
      const dotted = segments.filter((seg) => !noDot.has(seg.key));
      const expected: { key: string; x: number; y: number }[] = [];
      for (const seg of dotted) {
        expected.push({ key: seg.key, x: seg.p1.x, y: seg.p1.y });
        expected.push({ key: seg.key, x: seg.p2.x, y: seg.p2.y });
      }
      expected.push({ key: "apexCenter", x: 0, y: result.apexCenter });
      const domedBand = segments.find((seg) => seg.key === "domedBand");
      if (domed && domedBand) expected.push({ key: "domedBand", x: 0, y: domedBand.p1.y });
      expect(dots).toEqual(expected);
      expect(dots.some((dot) => dot.key === "boardConn" || dot.key === "bottomConn" || dot.key === "railConn")).toBe(false);
      if (result.hardEdge) expect(dots.some((dot) => dot.key === "hardEdge")).toBe(false);
      expect(dots.length).toBe(2 * dotted.length + 1 + (domed && domedBand ? 1 : 0));
      expect(dots[2 * dotted.length]).toEqual({ key: "apexCenter", x: 0, y: result.apexCenter });
    });
  }

  it("the tail of the default board has a hard edge, and it gets no dot", () => {
    const tail = computeRailBands(DEFAULT_RAIL_BAND_SPEC).tail;
    expect(tail.result.hardEdge).toBe(true);
    expect(tail.segments.some((seg) => seg.key === "hardEdge")).toBe(true);
    expect(railPlotDots(tail.segments, tail.result, tail.domed).some((dot) => dot.key === "hardEdge")).toBe(false);
  });
});

describe("a section saved before the scale and nudges existed", () => {
  it("reads the tip default 0.75, the centre's 1, and every nudge 0", () => {
    const legacy = (key: RailSectionKey) => {
      const { scaleFromCenter: _s, nudges: _n, ...rest } = DEFAULT_RAIL_BAND_SPEC[key];
      void _s;
      void _n;
      return rest as RailSectionSpec;
    };
    for (const key of ["nose", "center", "tail"] as const) {
      expect(computeRailSectionOutput(key, legacy(key), false)).toEqual(
        computeRailSectionOutput(key, DEFAULT_RAIL_BAND_SPEC[key], false),
      );
    }
    expect(computeRailSectionOutput("nose", legacy("nose"), false).result.scale).toBe(DEFAULT_TIP_RAIL_SCALE);
    expect(ZERO_RAIL_NUDGES).toEqual(Object.fromEntries(RAIL_NUDGE_KEYS.map((k) => [k, mm(0)])));
  });
});

describe("the sidebar's helpers (quick 261102-gec plan 02, 2026-11-02)", () => {
  it("the six nudges in the Advanced menu's order, their windows, and every one 0 on a new board (plan 04, PC25)", () => {
    expect([...RAIL_NUDGE_KEYS]).toEqual(["apexThickness", "deckMark1", "deckMark3", "domedDeckBand", "bottomTuck1", "bottomTuck3"]);
    expect(RAIL_NUDGE_LIMIT_IN.domedDeckBand).toBe(2);
    expect(RAIL_NUDGE_LIMIT_IN.deckMark1).toBe(0.5);
    expect(RAIL_NUDGE_LIMIT_IN.deckMark3).toBe(0.5);
    for (const k of ["apexThickness", "bottomTuck1"] as const) expect(RAIL_NUDGE_LIMIT_IN[k]).toBe(0.25);
    // R19 (the founder, 2026-11-02): "bottom tuck 3 tweak should go to ±3/4"".
    expect(RAIL_NUDGE_LIMIT_IN.bottomTuck3).toBe(0.75);
    expect(Object.keys(ZERO_RAIL_NUDGES)).toEqual([...RAIL_NUDGE_KEYS]);
    for (const key of ["nose", "center", "tail"] as const) {
      expect(Object.keys(defaultRailAdvanced(key).nudges)).toEqual([...RAIL_NUDGE_KEYS]);
      for (const k of RAIL_NUDGE_KEYS) expect(defaultRailAdvanced(key).nudges[k]).toBe(0);
    }
  });

  it("deckProfileSliderStep: both ends of the 75-100% slider stay exactly reachable at every thickness (R7, PC23)", () => {
    // Every thickness the RAILS sliders and the foil can give: 1" to 3 1/2" by 1/16".
    for (let sixteenths = 16; sixteenths <= 56; sixteenths += 1) {
      const thicknessIn = sixteenths / 16;
      const step = deckProfileSliderStep(thicknessIn);
      const count = (100 - DECK_PERCENT_MIN) / step;
      expect(Math.abs(count - Math.round(count)), `${thicknessIn}"`).toBeLessThan(1e-9);
      expect(Math.round(count), `${thicknessIn}"`).toBeGreaterThanOrEqual(1);
      expect(step, `${thicknessIn}"`).toBeGreaterThanOrEqual(0.01 - 1e-12);
    }
  });

  it("deckProfileSliderStep: one step is about one 1/16\" of rail thickness, as the prototype's rule was", () => {
    for (const thicknessIn of [1, 1.5, 2.5, 3.5]) {
      const step = deckProfileSliderStep(thicknessIn);
      const sixteenthAsPercent = (MIN_RAIL_MARK_IN / thicknessIn) * 100;
      // Rounding the step count moves the step by at most half a step's worth over the 25-point span.
      expect(Math.abs(step - sixteenthAsPercent)).toBeLessThanOrEqual(sixteenthAsPercent / 2);
    }
  });

  it("defaultRailAdvanced: every nudge 0, Single Tuck off, the tips' scale 0.75 and the centre's 1 — a new board's own values (PC20)", () => {
    for (const key of ["nose", "center", "tail"] as const) {
      const advanced = defaultRailAdvanced(key);
      expect(advanced.nudges).toEqual(ZERO_RAIL_NUDGES);
      expect(advanced.singleTuck).toBe(false);
      expect(advanced.scaleFromCenter).toBe(key === "center" ? 1 : DEFAULT_TIP_RAIL_SCALE);
      expect(advanced.nudges).toEqual(DEFAULT_RAIL_BAND_SPEC[key].nudges);
      expect(advanced.singleTuck).toBe(DEFAULT_RAIL_BAND_SPEC[key].singleTuck);
      expect(advanced.scaleFromCenter).toBe(DEFAULT_RAIL_BAND_SPEC[key].scaleFromCenter);
    }
  });

  it("RAIL_NUDGE_NAMES names every nudge with the DATA tab's own words", () => {
    const dataLabels = Object.values(RAIL_DATA_LABEL_ORDER).flat();
    expect(Object.keys(RAIL_NUDGE_NAMES).sort()).toEqual([...RAIL_NUDGE_KEYS].sort());
    for (const key of RAIL_NUDGE_KEYS) {
      expect(dataLabels, key).toContain(RAIL_NUDGE_NAMES[key]);
    }
    expect(new Set(Object.values(RAIL_NUDGE_NAMES)).size).toBe(RAIL_NUDGE_KEYS.length);
  });

  it("RAIL_NUDGE_STEP_IN is the app's 1/16\" step", () => {
    expect(RAIL_NUDGE_STEP_IN).toBe(MIN_RAIL_MARK_IN);
  });
});
