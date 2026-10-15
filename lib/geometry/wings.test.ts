import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC, TAIL_PRESETS, type OutlineSpec } from "./board";
import { buildOutline, sampleOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm } from "./units";
import {
  applyWings,
  curveHalfWidthAt,
  effectiveWingRadius,
  maxWingRadius,
  outlineWithoutWings,
  placedWings,
  wingFootprint,
  wingStepShape,
  wingStepShare,
  wingedHalfWidthAt,
  type Wing,
} from "./wings";

// Wings (quick 261014-wii, 2026-10-14, D1): a step applied after today's outline curve, its depth
// fading out by the tail pod. Every expected value below is read off the app's own functions or is
// a geometric identity — never a typed answer (CLAUDE.md Rule 1). The sketch's own numbers are
// pinned by the golden further down this file.

const BOARDS: { id: string; outline: OutlineSpec }[] = [
  { id: "default", outline: DEFAULT_BOARD_SPEC.outline },
  ...BOARD_PRESETS.map((p) => ({ id: p.id, outline: p.outline })),
  {
    id: "default-pin",
    outline: {
      ...DEFAULT_BOARD_SPEC.outline,
      tail: TAIL_PRESETS.pin.tail,
      tailAngle: TAIL_PRESETS.pin.tailAngle,
      tailFullness: TAIL_PRESETS.pin.tailFullness,
    },
  },
  {
    id: "default-diamond",
    outline: {
      ...DEFAULT_BOARD_SPEC.outline,
      tail: TAIL_PRESETS.diamond.tail,
      tailAngle: TAIL_PRESETS.diamond.tailAngle,
      tailFullness: TAIL_PRESETS.diamond.tailFullness,
    },
  },
];

function wing(stationIn: number, depthIn: number, runIn: number, radiusIn: number): Wing {
  return {
    station: inchesToMm(stationIn),
    depth: inchesToMm(depthIn),
    run: inchesToMm(runIn),
    radius: inchesToMm(radiusIn),
    lock: null,
    finOffset: mm(0),
  };
}

/** The five settings the golden records (F14). */
const SETTINGS: { id: string; wings: Wing[] }[] = [
  { id: "square", wings: [wing(11, 3 / 8, 0, 0)] },
  { id: "angled", wings: [wing(11, 3 / 8, 1 / 2, 0)] },
  { id: "rounded-max", wings: [wing(11, 3 / 8, 1 / 4, 3)] },
  { id: "stinger", wings: [wing(30, 1 / 2, 3 / 4, 1)] },
  { id: "two-wings", wings: [wing(11, 3 / 8, 1 / 4, 0), wing(15.5, 1 / 4, 1 / 2, 3 / 16)] },
];

/** The sketch's check013 wings, in millimetres. */
const CHECK_WINGS: Wing[] = [
  wing(11, 0.375, 0, 0),
  wing(11, 0.375, 0, 3),
  wing(11, 0.375, 1, 3),
  wing(11, 1, 0.5, 0.25),
  wing(30, 0.5, 0.5, 1),
];

describe("a board with no wings is today's board (D1, F15)", () => {
  it.each(BOARDS)("$id: no wings key and an empty list both build today's outline", ({ outline }) => {
    const today = buildOutline(outline);
    expect(buildOutline({ ...outline, wings: [] })).toEqual(today);
    expect(buildOutline(outlineWithoutWings({ ...outline, wings: [] }))).toEqual(today);
    expect(today.points).toHaveLength(161);
  });

  it("outlineWithoutWings hands back the same object when there is no wings key", () => {
    const outline = DEFAULT_BOARD_SPEC.outline;
    expect(outlineWithoutWings(outline)).toBe(outline);
    const winged = { ...outline, wings: [wing(11, 3 / 8, 0, 0)] };
    const bare = outlineWithoutWings(winged);
    expect("wings" in bare).toBe(false);
    expect(bare).toEqual(outline);
  });
});

describe("the step is applied after the curve (D1, F16)", () => {
  for (const board of BOARDS) {
    for (const setting of SETTINGS) {
      it(`${board.id}, ${setting.id}`, () => {
        const base = buildOutline(board.outline);
        const winged = buildOutline({ ...board.outline, wings: setting.wings });
        const placed = placedWings(setting.wings, base.length);

        // The curve's own 161 stations are all still there ...
        const wingedStations = new Set(winged.points.map((p) => p.station));
        for (const p of base.points) expect(wingedStations.has(p.station)).toBe(true);

        // ... and nose-ward of every step the outline is the curve the shaper drew, bit for bit.
        const noseMost = Math.max(...placed.map((w) => wingFootprint(w).stepStart));
        const byStation = new Map(winged.points.map((p) => [p.station, p]));
        for (const p of base.points) {
          if (p.station > noseMost) expect(byStation.get(p.station)!.halfWidth).toBe(p.halfWidth);
        }

        // The tail block keeps its number: the pod is untouched.
        expect(winged.halfTailBlockWidth).toBe(base.halfTailBlockWidth);
        expect(Math.abs(sampleOutline(winged, base.tailPodStation) - sampleOutline(base, base.tailPodStation))).toBeLessThan(1e-9);

        // Never wider than the widepoint, never below the stringer, sorted, and on the exact construction.
        let prev = -Infinity;
        for (const p of winged.points) {
          expect(p.halfWidth).toBeGreaterThanOrEqual(0);
          expect(p.halfWidth).toBeLessThanOrEqual(base.halfWidePointWidth);
          expect(p.station).toBeGreaterThanOrEqual(prev);
          prev = p.station;
          expect(Math.abs(p.halfWidth - wingedHalfWidthAt(base, placed, p.station))).toBeLessThan(1e-9);
        }

        // The spans, knots and handles are the curve's, unchanged; only points, area and the 12" widths move.
        expect(winged.segments).toEqual(base.segments);
        expect(winged.knots).toEqual(base.knots);
        expect(winged.handles).toEqual(base.handles);
        expect(winged.area).toBeLessThan(base.area);
      });
    }
  }

  it("applyWings with only depthless wings returns the base itself", () => {
    const base = buildOutline(DEFAULT_BOARD_SPEC.outline);
    expect(applyWings(base, [{ ...wing(11, 0, 0, 0) }])).toBe(base);
  });
});

describe("the step's share of the depth (the sketch's check013)", () => {
  it.each(CHECK_WINGS.map((w, i) => ({ i, w })))("wing $i: the share runs 0 to 1 without ever falling", ({ w }) => {
    const f = wingFootprint(w);
    let prev = -1;
    const from = f.stepStart + inchesToMm(0.5);
    const to = f.inner - inchesToMm(0.5);
    const step = inchesToMm(0.001);
    for (let s = from; s >= to; s -= step) {
      const p = wingStepShare(w, mm(s));
      expect(p).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = p;
    }
    expect(wingStepShare(w, mm(from))).toBe(0);
    expect(wingStepShare(w, mm(to))).toBe(1);
  });

  it.each(CHECK_WINGS.map((w, i) => ({ i, w })))("wing $i: every point of a rounded corner is its radius from its centre", ({ w }) => {
    const R = effectiveWingRadius(w);
    const shape = wingStepShape(w);
    if (R === 0) {
      expect(shape.points).toHaveLength(2);
      return;
    }
    const t = shape.tangent;
    const C1 = { x: w.station + t, y: R };
    const C2 = { x: w.station - w.run - t, y: w.depth - R };
    for (const p of shape.points) {
      const d1 = Math.abs(Math.hypot(p.station - C1.x, p.inward - C1.y) - R);
      const d2 = Math.abs(Math.hypot(p.station - C2.x, p.inward - C2.y) - R);
      expect(Math.min(d1, d2)).toBeLessThan(1e-9);
    }
  });

  it("with no rounding the step is the straight line from corner to corner", () => {
    const w = wing(11, 0.375, 0.5, 0);
    expect(Math.abs(wingStepShare(w, mm(w.station - w.run / 2)) - 0.5)).toBeLessThan(1e-9);
  });

  it("a square step takes nothing at its station and everything a hair behind it", () => {
    const w = wing(11, 0.375, 0, 0);
    expect(wingStepShare(w, w.station)).toBe(0);
    expect(wingStepShare(w, mm(w.station - inchesToMm(1e-6)))).toBe(1);
  });

  it("a square turn rounds to half its depth at most", () => {
    for (const depthIn of [1 / 16, 3 / 8, 1]) {
      const depth = inchesToMm(depthIn);
      expect(Math.abs(maxWingRadius({ run: mm(0), depth }) - depth / 2)).toBeLessThan(1e-9);
    }
  });
});

describe("two wings add up, and placement keeps a wing on the board", () => {
  it("away from the clamps, two wings take what each takes alone", () => {
    const base = buildOutline(DEFAULT_BOARD_SPEC.outline);
    const w1 = wing(11, 3 / 8, 1 / 4, 0);
    const w2 = wing(15.5, 1 / 4, 1 / 2, 3 / 16);
    const take = (wings: Wing[], s: number) => curveHalfWidthAt(base, mm(s)) - wingedHalfWidthAt(base, wings, mm(s));
    for (let sIn = 0.25; sIn <= 20; sIn += 0.05) {
      const s = inchesToMm(sIn);
      expect(Math.abs(take([w1, w2], s) - (take([w1], s) + take([w2], s)))).toBeLessThan(1e-9);
    }
  });

  it("placedWings keeps a station between 2 inches and the centre, and drops a wing with no depth", () => {
    const length = DEFAULT_BOARD_SPEC.outline.length;
    const placed = placedWings([wing(1, 3 / 8, 0, 0), wing(60, 3 / 8, 0, 0), wing(11, 0, 0, 0)], length);
    expect(placed).toHaveLength(2);
    expect(placed[0].station).toBe(inchesToMm(2));
    expect(placed[1].station).toBe(length / 2);
    const inside = wing(11, 3 / 8, 0, 0);
    expect(placedWings([inside], length)[0]).toBe(inside);
  });
});
