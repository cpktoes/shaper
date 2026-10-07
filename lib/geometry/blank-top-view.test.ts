import { describe, expect, it } from "vitest";
import { PRESET_BLANKS } from "@/lib/blanks/preset-blanks";
import { DEFAULT_BLANK_CUT, type BlankRecord } from "./blank";
import { placementRange, prepareBlank, type BoardOnBlankInput } from "./blank-fit";
import { buildBlankTopView, TIP_SEGMENT_SAMPLES } from "./blank-top-view";
import { DEFAULT_BOARD_SPEC } from "./board";
import { buildBlankProfile, type BlankSideView } from "./board-profile";
import { DEFAULT_FOIL_SPEC } from "./foil";
import { buildOutline, MEASURE_STATION_MM } from "./outline";
import { silhouette } from "./screen-tiles";
import { inchesToMm, mm, type Mm } from "./units";

// The blank seen from above (quick 261006-qfm). Every blank below is a real preset blank, and every
// expected number is read off the functions the app already trusts (`blankWidthAt`, `silhouette`)
// or off the catalogue record itself — never typed (CLAUDE.md Rule 1).

function findPresetBlank(vendor: string, name: string): BlankRecord {
  const blank = PRESET_BLANKS.blanks.find((b) => b.vendor === vendor && b.name === name);
  if (!blank) throw new Error(`${vendor} ${name} is not among the preset blanks`);
  return blank;
}

const RP_5_10 = findPresetBlank("US Blanks", `5'10"RP`);
const SP_7_4 = findPresetBlank("US Blanks", `7'4"SP`);
const B_9_4 = findPresetBlank("US Blanks", `9'4"B`);

// Drawing tolerances, not geometry answers (quick 261007-c3h D6; measured at plan time, F9): the
// drawn line may stray this far from the true curve at a tip — 24 steps measured 0.074 mm and
// 0.073 mm on these two blanks — and a round tip's first step in from the tip must leave the
// stringer steeper than this (88.8 and 88.7 degrees measured; today's curve leaves at about 68).
const DRAWN_LINE_TOLERANCE_MM = 0.5;
const ROUND_TIP_LEAVES_STRINGER_AT_DEG = 85;

/** The shortest distance from point p to the straight segment a–b. */
function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const BOARD_LENGTH = inchesToMm(70);
const GEOMETRY = buildOutline({ ...DEFAULT_BOARD_SPEC.outline, length: BOARD_LENGTH });
const SAMPLES = 120;

function boardInput(overrides: Partial<BoardOnBlankInput> = {}): BoardOnBlankInput {
  return {
    length: BOARD_LENGTH,
    centerThickness: inchesToMm(2.5),
    noseTip: DEFAULT_FOIL_SPEC.noseTip,
    tailTip: DEFAULT_FOIL_SPEC.tailTip,
    nose12Offset: mm(0),
    tail12Offset: mm(0),
    ...DEFAULT_BLANK_CUT,
    ...overrides,
  };
}

function sideView(record: BlankRecord, placement: Mm = mm(0)): BlankSideView {
  const profile = buildBlankProfile(prepareBlank(record), boardInput(), placement);
  if (!profile.blank) throw new Error("expected a blank side view");
  return profile.blank;
}

function topViewOf(blank: BlankSideView | null, geometry = GEOMETRY, samples = SAMPLES) {
  return buildBlankTopView({ blank, geometry, length: BOARD_LENGTH, samples });
}

describe("buildBlankTopView — the blank's outline through its printed widths (quick 261006-qfm)", () => {
  for (const record of [RP_5_10, SP_7_4]) {
    describe(`${record.vendor} ${record.name}`, () => {
      const blank = sideView(record);
      const view = topViewOf(blank);

      it("runs tail to nose in ascending order, from the blank's tail tip to its nose tip", () => {
        const stations = view.blankOutline.map((s) => s.station);
        expect(stations[0]).toBeCloseTo(blank.start, 9);
        expect(stations[stations.length - 1]).toBeCloseTo(blank.end, 9);
        for (let i = 1; i < stations.length; i++) expect(stations[i]).toBeGreaterThan(stations[i - 1]);
      });

      it("reads every half-width off blankWidthAt, never below 0", () => {
        for (const sample of view.blankOutline) {
          expect(sample.halfWidth).toBeGreaterThanOrEqual(0);
          expect(sample.halfWidth).toBe(Math.max(0, blank.onBlank.blankWidthAt(sample.station) / 2));
        }
      });

      it("passes exactly through every printed width", () => {
        for (const station of record.stations) {
          if (station.widthMm === null) continue;
          const at = blank.start + station.fromTailMm;
          const sample = view.blankOutline.find((s) => Math.abs(s.station - at) < 1e-6);
          expect(sample, `a sample at ${station.label}`).toBeDefined();
          expect(sample!.halfWidth).toBeCloseTo(station.widthMm / 2, 6);
        }
      });

      it("marks T12, C and N12, in that order, 12 inches in from each blank tip and at its middle", () => {
        expect(view.marks.map((m) => m.label)).toEqual(["T12", "C", "N12"]);
        const [t12, c, n12] = view.marks;
        expect(t12.station).toBeCloseTo(blank.start + MEASURE_STATION_MM, 9);
        expect(c.station).toBeCloseTo((blank.start + blank.end) / 2, 9);
        expect(n12.station).toBeCloseTo(blank.end - MEASURE_STATION_MM, 9);
        for (const mark of view.marks) {
          expect(mark.halfWidth).toBeCloseTo(blank.onBlank.blankWidthAt(mark.station) / 2, 9);
        }
      });

      it("runs the stringer end to end", () => {
        expect(view.stringer).not.toBeNull();
        expect(view.stringer!.from).toBeCloseTo(blank.start, 9);
        expect(view.stringer!.to).toBeCloseTo(blank.end, 9);
      });

      it("puts one measuring dot on each printed width, at exactly half of it", () => {
        const printed = record.stations.filter((s) => s.widthMm !== null);
        expect(view.widthDots).toHaveLength(printed.length);
        printed.forEach((station, i) => {
          expect(view.widthDots[i].station).toBeCloseTo(blank.start + station.fromTailMm, 9);
          expect(view.widthDots[i].halfWidth).toBe(station.widthMm! / 2);
        });
      });

      it("draws the board as TEMPLATE's own silhouette", () => {
        expect(view.boardOutline).toEqual(silhouette(GEOMETRY));
      });

      it("reaches from the blank's tail tip to its nose tip, or the board's own tips if those reach further", () => {
        expect(view.extent.from).toBe(Math.min(0, blank.start));
        expect(view.extent.to).toBe(Math.max(BOARD_LENGTH, blank.end));
      });

      it("takes halfWidthMax from the widest of the blank and the board", () => {
        const all = [...view.blankOutline.map((s) => s.halfWidth), ...view.boardOutline.map((p) => Math.abs(p.w))];
        for (const value of all) expect(view.halfWidthMax).toBeGreaterThanOrEqual(value);
        expect(view.halfWidthMax).toBe(Math.max(...all));
      });
    });
  }

  it("draws the 5'10\"RP square at both tips, at half its printed T0 and N0", () => {
    const blank = sideView(RP_5_10);
    const view = topViewOf(blank);
    const t0 = RP_5_10.stations[0];
    const n0 = RP_5_10.stations[RP_5_10.stations.length - 1];
    expect(t0.widthMm!).toBeGreaterThan(0);
    expect(n0.widthMm!).toBeGreaterThan(0);
    expect(view.blankOutline[0].halfWidth).toBeCloseTo(t0.widthMm! / 2, 6);
    expect(view.blankOutline[view.blankOutline.length - 1].halfWidth).toBeCloseTo(n0.widthMm! / 2, 6);
  });

  it("draws the 7'4\"SP and the 9'4\"B round at the nose, where the catalogue prints 0 (quick 261007-c3h, D6)", () => {
    for (const record of [SP_7_4, B_9_4]) {
      const blank = sideView(record);
      const view = topViewOf(blank);
      const n0 = record.stations[record.stations.length - 1];
      const outline = view.blankOutline;
      const tip = outline[outline.length - 1];
      expect(tip.halfWidth).toBeCloseTo(n0.widthMm! / 2, 9);
      // The tip sits on the stringer...
      expect(tip.halfWidth).toBe(0);
      // ...and the outline leaves it nearly straight across the board, not along a point's slanted sides.
      const first = outline[outline.length - 2];
      const angle = (Math.atan2(first.halfWidth, tip.station - first.station) * 180) / Math.PI;
      expect(angle, `${record.name}'s first step in from the nose tip`).toBeGreaterThan(
        ROUND_TIP_LEAVES_STRINGER_AT_DEG,
      );
    }
  });

  it("follows the blank's outline within half a millimetre at both tips, on the 7'4\"SP and the 9'4\"B (quick 261007-c3h, D6)", () => {
    for (const record of [SP_7_4, B_9_4]) {
      const blank = sideView(record);
      const view = topViewOf(blank);
      const printed = record.stations.filter((station) => station.widthMm !== null);
      const trueHalfWidth = (station: number) => blank.onBlank.blankWidthAt(mm(station)) / 2;
      const tips = [
        { tip: blank.start + printed[0].fromTailMm, inner: blank.start + printed[1].fromTailMm },
        {
          tip: blank.start + printed[printed.length - 1].fromTailMm,
          inner: blank.start + printed[printed.length - 2].fromTailMm,
        },
      ];
      let worst = 0;
      let pairs = 0;
      for (const { tip, inner } of tips) {
        const lo = Math.min(tip, inner);
        const hi = Math.max(tip, inner);
        const inside = view.blankOutline.filter((s) => s.station >= lo - 1e-6 && s.station <= hi + 1e-6);
        for (let i = 0; i + 1 < inside.length; i++) {
          pairs++;
          const [a, b] = [inside[i], inside[i + 1]];
          // 50 points of the true curve between the two neighbours, evenly in the square root of the
          // distance from this tip — the spacing a round tip turns in.
          const ra = Math.sqrt(Math.abs(a.station - tip));
          const rb = Math.sqrt(Math.abs(b.station - tip));
          for (let j = 0; j <= 50; j++) {
            const r = ra + ((rb - ra) * j) / 50;
            const station = tip + Math.sign(inner - tip) * r * r;
            worst = Math.max(
              worst,
              distanceToSegment(station, trueHalfWidth(station), a.station, a.halfWidth, b.station, b.halfWidth),
            );
          }
        }
      }
      expect(pairs, `${record.name} has samples inside both tip segments`).toBeGreaterThan(TIP_SEGMENT_SAMPLES);
      expect(worst, `${record.name}'s drawn line strays at most this far (mm)`).toBeLessThanOrEqual(
        DRAWN_LINE_TOLERANCE_MM,
      );
    }
  });
});

describe("buildBlankTopView — the board's own outline, notch and all (quick 261006-qfm)", () => {
  it("closes a swallow at its crotch, with the tail pod's half-width first", () => {
    const tail = { kind: "swallow" as const, endWidth: inchesToMm(12), crotchDepth: inchesToMm(2) };
    const geometry = buildOutline({ ...DEFAULT_BOARD_SPEC.outline, length: BOARD_LENGTH, tail });
    const view = topViewOf(sideView(RP_5_10), geometry);
    expect(view.boardOutline).toEqual(silhouette(geometry));
    const last = view.boardOutline[view.boardOutline.length - 1];
    expect(last.station).toBe(tail.crotchDepth);
    expect(last.w).toBe(0);
    expect(view.boardOutline[0].station).toBe(geometry.points[0].station);
    expect(view.boardOutline[0].w).toBeGreaterThan(0);
  });

  it("closes the default squash tail at the tail's centre", () => {
    const view = topViewOf(null);
    const last = view.boardOutline[view.boardOutline.length - 1];
    expect(last.station).toBe(0);
    expect(last.w).toBe(0);
  });
});

describe("buildBlankTopView — the Placement slider moves the blank, never the board (quick 261006-qfm)", () => {
  const prepared = prepareBlank(SP_7_4);
  const { max } = placementRange(prepared.lengthMm, BOARD_LENGTH);
  const atZero = sideView(SP_7_4, mm(0));
  const atMax = sideView(SP_7_4, max);
  const a = topViewOf(atZero);
  const b = topViewOf(atMax);

  it("has a real reach to move through", () => {
    expect(max).toBeGreaterThan(0);
    expect(atMax.start).not.toBeCloseTo(atZero.start, 3);
  });

  it("keeps the blank's own shape, marks and stringer, measured from its tail tip", () => {
    expect(a.blankOutline).toHaveLength(b.blankOutline.length);
    a.blankOutline.forEach((sample, i) => {
      expect(b.blankOutline[i].station - atMax.start).toBeCloseTo(sample.station - atZero.start, 6);
      expect(b.blankOutline[i].halfWidth).toBeCloseTo(sample.halfWidth, 6);
    });
    a.marks.forEach((mark, i) => {
      expect(b.marks[i].station - atMax.start).toBeCloseTo(mark.station - atZero.start, 6);
      expect(b.marks[i].halfWidth).toBeCloseTo(mark.halfWidth, 6);
    });
    expect(b.stringer!.from - atMax.start).toBeCloseTo(a.stringer!.from - atZero.start, 6);
    expect(b.stringer!.to - atMax.start).toBeCloseTo(a.stringer!.to - atZero.start, 6);
  });

  it("leaves the board exactly where it was, and the drawn extent follows the blank", () => {
    expect(b.boardOutline).toEqual(a.boardOutline);
    expect(a.extent).toEqual({ from: Math.min(0, atZero.start), to: Math.max(BOARD_LENGTH, atZero.end) });
    expect(b.extent).toEqual({ from: Math.min(0, atMax.start), to: Math.max(BOARD_LENGTH, atMax.end) });
  });
});

describe("buildBlankTopView — no blank picked: the board alone (D-02, quick 261006-qfm)", () => {
  const view = topViewOf(null);

  it("draws no blank, no marks, no stringer and no dots", () => {
    expect(view.blankOutline).toEqual([]);
    expect(view.marks).toEqual([]);
    expect(view.widthDots).toEqual([]);
    expect(view.stringer).toBeNull();
  });

  it("spans the board's own length, as wide as its widest point", () => {
    expect(view.extent).toEqual({ from: 0, to: BOARD_LENGTH });
    expect(view.halfWidthMax).toBe(Math.max(...silhouette(GEOMETRY).map((p) => Math.abs(p.w))));
  });
});

describe("buildBlankTopView — corrupt input stays drawable (T-qfm-02, quick 261006-qfm)", () => {
  it("reads a NaN blank width as 0 and keeps halfWidthMax finite", () => {
    const real = sideView(RP_5_10);
    const broken: BlankSideView = {
      ...real,
      onBlank: { ...real.onBlank, blankWidthAt: () => Number.NaN },
    };
    const view = topViewOf(broken);
    expect(view.blankOutline.length).toBeGreaterThan(0);
    for (const sample of view.blankOutline) expect(sample.halfWidth).toBe(0);
    for (const mark of view.marks) expect(mark.halfWidth).toBe(0);
    expect(Number.isFinite(view.halfWidthMax)).toBe(true);
  });

  it("gives at least two intervals for a sample count below 2 or not a number", () => {
    // A blank with no printed widths: only the evenly spaced stations remain to count.
    const real = sideView(RP_5_10);
    const bare: BlankSideView = {
      ...real,
      record: { ...real.record, stations: real.record.stations.map((s) => ({ ...s, widthMm: null })) },
    };
    for (const samples of [0, 1, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const view = topViewOf(bare, GEOMETRY, samples);
      expect(view.blankOutline.length, `samples ${samples}`).toBeGreaterThanOrEqual(3);
      expect(view.blankOutline[0].station).toBeCloseTo(real.start, 9);
      expect(view.blankOutline[view.blankOutline.length - 1].station).toBeCloseTo(real.end, 9);
    }
  });
});
