import { describe, expect, it } from "vitest";
import { BOARD_PRESETS } from "./presets";
import { PRESET_BLANKS, presetBlank, presetFitContext } from "@/lib/blanks/preset-blanks";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import { DEFAULT_BLANK_CUT, type BlankRecord, type BlankStation } from "./blank";
import {
  blankStationOf,
  boardOnBlank,
  fitAt,
  prepareBlank,
  prepareBlankPchip,
  type BoardOnBlankInput,
} from "./blank-fit";
import { buildBlankTopView } from "./blank-top-view";
import { DEFAULT_BOARD_SPEC } from "./board";
import { buildBlankProfile } from "./board-profile";
import { DEFAULT_FOIL_SPEC } from "./foil";
import { buildOutline } from "./outline";
import { preparePchip } from "./pchip";
import { prepareRootCurve } from "./root-curve";
import { roundZeroTips } from "./round-tip";
import { inchesToMm, mm, type Mm } from "./units";

// The round nose (quick 261007-c3h, sketch 012 C): a blank whose catalogue prints a tip 0 wide is
// drawn round inside its last printed station, and the fit check reads the same curve. Every
// expected value below is read off the app's own functions or the catalogue record itself — never a
// typed answer (CLAUDE.md Rule 1). The synthetic knots and the mirrored record are INPUTS, not
// expected values. The formula's own numbers (A and B) are pinned by the golden in the second half
// of this file, never recomputed here.

function presetRecord(vendor: string, name: string): BlankRecord {
  const blank = PRESET_BLANKS.blanks.find((b) => b.vendor === vendor && b.name === name);
  if (!blank) throw new Error(`${vendor} ${name} is not among the preset blanks`);
  return blank;
}

/** A blank's own printed widths as knots, tail to nose. */
function widthKnots(record: BlankRecord): { x: number; y: number }[] {
  return record.stations
    .filter((station) => station.widthMm !== null)
    .map((station) => ({ x: station.fromTailMm as number, y: station.widthMm as number }));
}

function knotsOf(record: BlankRecord, pick: (station: BlankStation) => number | null) {
  return record.stations
    .filter((station) => pick(station) !== null)
    .map((station) => ({ x: station.fromTailMm as number, y: pick(station) as number }));
}

const SP_7_4 = presetRecord("US Blanks", `7'4"SP`);
const B_9_4 = presetRecord("US Blanks", `9'4"B`);

const PRESET_CASES = [
  { presetId: "midlength", record: SP_7_4 },
  { presetId: "longboard", record: B_9_4 },
] as const;

function presetById(id: string) {
  const preset = BOARD_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`no preset ${id}`);
  return preset;
}

const BOARD_LENGTH = inchesToMm(70);
const GEOMETRY = buildOutline({ ...DEFAULT_BOARD_SPEC.outline, length: BOARD_LENGTH });

function boardInput(): BoardOnBlankInput {
  return {
    length: BOARD_LENGTH,
    centerThickness: inchesToMm(2.5),
    noseTip: DEFAULT_FOIL_SPEC.noseTip,
    tailTip: DEFAULT_FOIL_SPEC.tailTip,
    nose12Offset: mm(0),
    tail12Offset: mm(0),
    ...DEFAULT_BLANK_CUT,
  };
}

describe("the round nose reaches the top view and the fit check alike (the tracer, D1, D6, D7)", () => {
  for (const { presetId, record } of PRESET_CASES) {
    describe(`${record.vendor} ${record.name}`, () => {
      const knots = widthKnots(record);
      const last = knots[knots.length - 1];
      const station = knots[knots.length - 2];
      const prepared = prepareBlank(record);
      const today = prepareRootCurve(knots, "fall");
      const middle = (station.x + last.x) / 2;

      it("reads the printed last two widths exactly, with a vertical slope at the tip", () => {
        expect(last.y).toBe(0);
        expect(station.y).toBeGreaterThan(0);
        expect(prepared.width.sample(station.x)).toBe(station.y);
        expect(prepared.width.sample(last.x)).toBe(last.y);
        expect(prepared.width.slopeAt(last.x)).toBe(-Infinity);
        expect(Number.isFinite(today.slopeAt(last.x))).toBe(true);
      });

      it("holds more foam than today's curve at the middle of the last segment", () => {
        expect(prepared.width.sample(middle)).toBeGreaterThan(today.sample(middle));
      });

      it("draws a round nose on ROCKER's top view: never narrower than today's, wider at the middle of the segment", () => {
        const profile = buildBlankProfile(prepared, boardInput(), mm(0));
        const blank = profile.blank;
        if (!blank) throw new Error("expected a blank side view");
        const view = buildBlankTopView({ blank, geometry: GEOMETRY, length: BOARD_LENGTH, samples: 120 });
        const inside = view.blankOutline.filter(
          (sample) => sample.station - blank.start > station.x && sample.station - blank.start < last.x,
        );
        expect(inside.length).toBeGreaterThan(2);
        for (const sample of inside) {
          const todayHalf = Math.max(0, today.sample(sample.station - blank.start) / 2);
          expect(sample.halfWidth).toBeGreaterThanOrEqual(todayHalf - 1e-9);
        }
        const nearest = inside.reduce((best, sample) =>
          Math.abs(sample.station - blank.start - middle) < Math.abs(best.station - blank.start - middle)
            ? sample
            : best,
        );
        const nearestToday = Math.max(0, today.sample(nearest.station - blank.start) / 2);
        expect(nearest.halfWidth).toBeGreaterThan(nearestToday);
      });

      it("makes the fit check read the same curve: a board refused on today's nose fits on the round one (F8)", () => {
        const preset = presetById(presetId);
        const context = presetFitContext(preset);
        const pick = presetBlank(preset);
        const settings = toFitSettings(DEFAULT_FIT_DEFAULTS);
        const onRound = boardOnBlank(prepared, context.board, pick.placement);
        const onToday = boardOnBlank({ ...prepared, width: today }, context.board, pick.placement);
        // The preset's own outline fits on either curve.
        expect(fitAt(onRound, context.halfWidthAt, context.widePointStation, settings).fits).toBe(true);
        expect(fitAt(onToday, context.halfWidthAt, context.widePointStation, settings).fits).toBe(true);

        // An outline halfway between today's width and the round one inside the last segment: more
        // than today's foam can hold, less than the round one's.
        const halfway = (s: Mm): Mm => {
          const x = blankStationOf(s, onRound.placement, context.board.length, prepared.lengthMm);
          if (x > station.x && x < last.x) {
            return mm(((today.sample(x) + prepared.width.sample(x)) / 2 - settings.widthMargin) / 2);
          }
          return context.halfWidthAt(s);
        };
        const refused = fitAt(onToday, halfway, context.widePointStation, settings);
        expect(refused.fits).toBe(false);
        expect(refused.worst.kind).toBe("wide");
        expect(fitAt(onRound, halfway, context.widePointStation, settings).fits).toBe(true);
      });
    });
  }
});

describe("roundZeroTips — the rule (D1)", () => {
  const knots = widthKnots(SP_7_4);
  const last = knots[knots.length - 1];
  const station = knots[knots.length - 2];
  const today = prepareRootCurve(knots, "fall");
  const round = roundZeroTips(today);

  it("reads the station's printed width exactly and 0 exactly at the tip", () => {
    expect(round.sample(station.x)).toBe(station.y);
    expect(round.sample(last.x)).toBe(0);
  });

  it("is bit-identical to the curve it wraps from the tail tip up to the station", () => {
    const steps = 1000;
    for (let i = 0; i <= steps; i++) {
      // A fraction of the station can land one rounding step past it (F4), so clamp.
      const x = Math.min((station.x * i) / steps, station.x);
      expect(round.sample(x)).toBe(today.sample(x));
    }
  });

  it("stays within [0, the station's width] inside and never rises toward the tip", () => {
    const steps = 1000;
    let previous = station.y;
    for (let i = 1; i < steps; i++) {
      const x = station.x + ((last.x - station.x) * i) / steps;
      const y = round.sample(x);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(station.y);
      expect(y).toBeLessThanOrEqual(previous + 1e-9);
      previous = y;
    }
  });
});

describe("roundZeroTips — when it leaves the curve alone (D2)", () => {
  it("hands back the same object for a tip printed wider than 0", () => {
    const curve = prepareRootCurve(
      [
        { x: 0, y: 200 },
        { x: 500, y: 400 },
        { x: 1000, y: 120 },
      ],
      "fall",
    );
    expect(roundZeroTips(curve)).toBe(curve);
  });

  it("hands back the same object when the last two stations both print 0", () => {
    const curve = prepareRootCurve(
      [
        { x: 0, y: 100 },
        { x: 500, y: 300 },
        { x: 900, y: 0 },
        { x: 1000, y: 0 },
      ],
      "fall",
    );
    expect(roundZeroTips(curve)).toBe(curve);
  });

  it("hands back the same object when the parabola would be more pointed than a straight line to the tip", () => {
    const curve = prepareRootCurve(
      [
        { x: 0, y: 500 },
        { x: 1000, y: 500 },
        { x: 1100, y: 100 },
        { x: 1200, y: 0 },
      ],
      "fall",
    );
    expect(roundZeroTips(curve)).toBe(curve);
  });

  it("hands back the same object for fewer than two knots", () => {
    const none = prepareRootCurve([], "fall");
    const one = prepareRootCurve([{ x: 0, y: 5 }], "fall");
    expect(roundZeroTips(none)).toBe(none);
    expect(roundZeroTips(one)).toBe(one);
  });

  it("returns a new curve with the SAME xs and ys when a tip rounds, and never touches the wrapped slopes", () => {
    const today = prepareRootCurve(widthKnots(SP_7_4), "fall");
    const slopesBefore = Array.from(today.slopes);
    const round = roundZeroTips(today);
    expect(round).not.toBe(today);
    expect(round.xs).toBe(today.xs);
    expect(round.ys).toBe(today.ys);
    expect(Array.from(today.slopes)).toEqual(slopesBefore);
    expect(Number.isFinite(today.slopes[today.slopes.length - 1])).toBe(true);
    expect(round.slopes[round.slopes.length - 1]).toBe(-Infinity);
  });
});

describe("roundZeroTips — width only (D3)", () => {
  it("leaves the blank's thickness and rocker exactly as the square-root rule draws them", () => {
    const prepared = prepareBlank(SP_7_4);
    const thicknessToday = prepareRootCurve(knotsOf(SP_7_4, (s) => s.thicknessMm), "fall");
    const rockerToday = prepareRootCurve(knotsOf(SP_7_4, (s) => s.rockerMm), "rise");
    for (let i = 0; i <= 400; i++) {
      const x = (SP_7_4.lengthMm * i) / 400;
      expect(prepared.thickness.sample(x)).toBe(thicknessToday.sample(x));
      expect(prepared.rocker.curve.sample(x)).toBe(rockerToday.sample(x));
    }
  });

  it("leaves the pchip rule, kept by name for old boards, exactly as it was", () => {
    const pchip = prepareBlankPchip(SP_7_4);
    const direct = preparePchip(widthKnots(SP_7_4));
    for (const slope of pchip.width.slopes) expect(Number.isFinite(slope)).toBe(true);
    for (let i = 0; i <= 400; i++) {
      const x = (SP_7_4.lengthMm * i) / 400;
      expect(pchip.width.sample(x)).toBe(direct.sample(x));
    }
  });
});

describe("roundZeroTips — both tips (D4)", () => {
  const knots = [
    { x: 0, y: 0 },
    { x: 150, y: 300 },
    { x: 900, y: 500 },
    { x: 1650, y: 300 },
    { x: 1800, y: 0 },
  ];
  const round = roundZeroTips(prepareRootCurve(knots, "fall"));

  it("is mirror-symmetric inside both rounded segments", () => {
    for (let i = 1; i < 100; i++) {
      const x = (150 * i) / 100;
      expect(round.sample(x)).toBeCloseTo(round.sample(1800 - x), 9);
    }
  });

  it("reads a vertical slope at each tip: +Infinity at a tail, −Infinity at a nose", () => {
    expect(round.slopes[0]).toBe(Infinity);
    expect(round.slopeAt(0)).toBe(Infinity);
    expect(round.slopes[4]).toBe(-Infinity);
    expect(round.slopeAt(1800)).toBe(-Infinity);
  });

  it("draws the 7'4\"SP's round nose as a round tail when the blank is mirrored end for end", () => {
    const length = SP_7_4.lengthMm;
    const swap = (label: string) => (label.startsWith("T") ? `N${label.slice(1)}` : label.startsWith("N") ? `T${label.slice(1)}` : label);
    const mirrored: BlankRecord = {
      ...SP_7_4,
      stations: [...SP_7_4.stations]
        .reverse()
        .map((s) => ({ ...s, label: swap(s.label), fromTailMm: mm(length - s.fromTailMm) })),
    };
    const original = prepareBlank(SP_7_4).width;
    const flipped = prepareBlank(mirrored).width;
    const kn = widthKnots(SP_7_4);
    const from = kn[kn.length - 2].x;
    expect(flipped.slopes[0]).toBe(Infinity);
    expect(flipped.slopeAt(0)).toBe(Infinity);
    for (let i = 1; i < 20; i++) {
      const x = from + ((length - from) * i) / 20;
      expect(flipped.sample(length - x)).toBeCloseTo(original.sample(x), 9);
      expect(flipped.slopeAt(length - x)).toBeCloseTo(-original.slopeAt(x), 9);
    }
  });
});

describe("roundZeroTips — the slope (D5)", () => {
  const knots = widthKnots(SP_7_4);
  const last = knots[knots.length - 1];
  const station = knots[knots.length - 2];
  const today = prepareRootCurve(knots, "fall");
  const round = roundZeroTips(today);

  it("matches a central difference of the width inside the rounded segment", () => {
    const h = 1e-4;
    for (let i = 1; i < 50; i++) {
      const x = station.x + ((last.x - station.x) * i) / 50;
      const numeric = (round.sample(x + h) - round.sample(x - h)) / (2 * h);
      const exact = round.slopeAt(x);
      expect(Math.abs(numeric - exact)).toBeLessThanOrEqual(1e-6 * Math.abs(exact) + 1e-9);
    }
  });

  it("joins today's slope smoothly at the station", () => {
    expect(Math.abs(round.slopeAt(station.x + 1e-7) - today.slopeAt(station.x))).toBeLessThan(1e-6);
  });

  it("reads 0 past either end and for a non-finite position, as every width curve does", () => {
    expect(round.slopeAt(last.x + 1)).toBe(0);
    expect(round.slopeAt(-1)).toBe(0);
    expect(round.slopeAt(Number.NaN)).toBe(0);
  });
});
