import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import golden from "./__fixtures__/wings-golden.json";
import { DEFAULT_BOARD_SPEC, TAIL_PRESETS, type OutlineSpec } from "./board";
import { deriveEffectiveFins } from "./design";
import { DEFAULT_FIN_PLACEMENT_SPEC, computeFinPlacement, importedFinTailFromOutline, type FinPlacementSpec } from "./fins";
import { buildOutline, sampleOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm, mmToInches } from "./units";
import {
  NO_FIN_EDGES,
  WING_DEFAULT_DEPTH_IN,
  WING_POSITION_MIN_IN,
  WING_SECOND_BY_HAND_IN,
  applyWings,
  canAddSecondWing,
  clampWingStations,
  curveHalfWidthAt,
  effectiveWingRadius,
  maxWingRadius,
  nextWing,
  outlineForFins,
  outlineWithoutWings,
  placedWings,
  removeWing,
  slotWingLocks,
  wingFinBoxDistance,
  wingFootprint,
  wingLockEdge,
  wingLockFitsSlot,
  wingOrderGap,
  wingOrderState,
  wingPositionRangeForSlot,
  wingPositionRangeIn,
  wingPositionTop,
  wingRadiusTop,
  wingStepShape,
  wingStepShare,
  wingedHalfWidthAt,
  wingReadouts,
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
        const placed = placedWings(setting.wings, base);

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

describe("the wing maths is the founder's own sketch (D10, F13, F14)", () => {
  // The expected numbers are the sketch's own output: scripts/extract-wings-golden.ts EXECUTES
  // reference/sketches/013-wings-curves.js and records what it draws. Each case's board spec is read
  // from the golden's own `boards` entry — an input — so a later preset recapture never breaks it.
  const boards = new Map(golden.boards.map((b) => [b.id, b.outline as unknown as OutlineSpec]));
  const TOLERANCE_MM = 1e-9;
  let pointsChecked = 0;

  it.each(golden.cases.map((c) => ({ ...c, label: `${c.board}, ${c.setting}` })))(
    "$label: every recorded width and readout",
    (c) => {
      const spec = boards.get(c.board);
      if (!spec) throw new Error(`the golden names a board it does not record: ${c.board}`);
      const g = buildOutline(spec);
      const wingsMm: Wing[] = c.wings.map((w) => ({
        station: inchesToMm(w.stationIn),
        depth: inchesToMm(w.depthIn),
        run: inchesToMm(w.runIn),
        radius: inchesToMm(w.radiusIn),
        lock: null,
        finOffset: mm(0),
      }));
      let worst = 0;
      for (const p of c.points) {
        const app = 2 * wingedHalfWidthAt(g, wingsMm, inchesToMm(p.sIn));
        worst = Math.max(worst, Math.abs(app - inchesToMm(p.widthIn)));
      }
      pointsChecked += c.points.length;
      expect(worst).toBeLessThan(TOLERANCE_MM);

      const readouts = wingReadouts(g, wingsMm);
      c.readouts.forEach((r, i) => {
        const w = wingsMm[i];
        const f = wingFootprint(w);
        expect(Math.abs(maxWingRadius(w) - inchesToMm(r.maxRadiusIn))).toBeLessThan(TOLERANCE_MM);
        expect(Math.abs(effectiveWingRadius(w) - inchesToMm(r.radiusUsedIn))).toBeLessThan(TOLERANCE_MM);
        expect(Math.abs(f.stepStart - inchesToMm(r.stepStartIn))).toBeLessThan(TOLERANCE_MM);
        expect(Math.abs(f.inner - inchesToMm(r.innerIn))).toBeLessThan(TOLERANCE_MM);
        expect(Math.abs(readouts[i].widthAhead - inchesToMm(r.widthAheadIn))).toBeLessThan(TOLERANCE_MM);
        expect(Math.abs(readouts[i].widthBehind - inchesToMm(r.widthBehindIn))).toBeLessThan(TOLERANCE_MM);
      });
    },
  );

  it("checked every recorded station across all seven boards and five settings", () => {
    expect(golden.cases).toHaveLength(golden.boards.length * 5);
    expect(pointsChecked).toBeGreaterThan(8000);
  });

  it("the generator executes the sketch's own code", () => {
    const source = readFileSync(path.resolve(process.cwd(), "scripts/extract-wings-golden.ts"), "utf8");
    expect(source).toContain("reference/sketches/013-wings-curves.js");
    expect(source).toContain("wingedPoints");
    expect(golden.provenance).toContain("013-wings-curves.js");
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

  it("placedWings keeps a station between 2 inches and the top, and drops a wing with no depth", () => {
    const g = buildOutline(DEFAULT_BOARD_SPEC.outline);
    const placed = placedWings([wing(60, 3 / 8, 0, 0), wing(1, 3 / 8, 0, 0), wing(11, 0, 0, 0)], g);
    expect(placed).toHaveLength(2);
    expect(placed[0].station).toBe(wingPositionTop(g));
    expect(placed[1].station).toBe(inchesToMm(2));
    const inside = wing(11, 3 / 8, 0, 0);
    expect(placedWings([inside], g)[0]).toBe(inside);
  });
});

// ---------------------------------------------------------------------------------------------
// The founder's rulings after the first preview (quick 261015-hz7, 2026-10-15): the top (D3), the
// order (D2), the slots (D1) and the defaults (D5). Every expected value is read off the app's own
// outline and fin marks, or is a stated inch rule through `inchesToMm` (CLAUDE.md Rule 1).
// ---------------------------------------------------------------------------------------------

/** The five boards with the fins FINS places on them (Import Template on), plus the Shortboard as a quad. */
const FIN_BOARDS: { id: string; outline: OutlineSpec; fins: FinPlacementSpec }[] = [
  { id: "default", outline: DEFAULT_BOARD_SPEC.outline, fins: DEFAULT_FIN_PLACEMENT_SPEC },
  ...BOARD_PRESETS.map((p) => ({ id: p.id, outline: p.outline, fins: p.fins })),
];

function marksOf(outline: OutlineSpec, fins: FinPlacementSpec) {
  const g = buildOutline(outline);
  return computeFinPlacement(deriveEffectiveFins(fins, true, outline, g), importedFinTailFromOutline(g)).marks;
}

function inchesOnGrid(station: number, system: "imperial" | "metric"): number {
  const grid = system === "metric" ? 1 : inchesToMm(1 / 16);
  return Math.floor(station / grid + 1e-9) * grid;
}

describe("the position top is the centre or the widepoint, whichever is nearer the tail (D3)", () => {
  it.each(FIN_BOARDS)("$id", ({ outline }) => {
    const g = buildOutline(outline);
    expect(wingPositionTop(g)).toBe(Math.min(g.length / 2, g.widePointStation));
    expect(wingPositionRangeIn(g)).toEqual({ min: WING_POSITION_MIN_IN, max: mmToInches(wingPositionTop(g)) });
  });

  it("the default board's top is its widepoint; the Fish's is its centre", () => {
    const def = buildOutline(DEFAULT_BOARD_SPEC.outline);
    expect(wingPositionTop(def)).toBe(def.widePointStation);
    expect(def.widePointStation).toBeLessThan(def.length / 2);
    const fish = buildOutline(BOARD_PRESETS.find((p) => p.id === "fish")!.outline);
    expect(wingPositionTop(fish)).toBe(fish.length / 2);
  });
});

describe("wing 2 sits behind wing 1 by the larger of 1/2 inch and twice wing 1's run (D2)", () => {
  const g = buildOutline(DEFAULT_BOARD_SPEC.outline);
  const lo = inchesToMm(WING_POSITION_MIN_IN);

  it("wingOrderGap: a 0 and a 1/4 inch run give 1/2 inch; a 2 inch run gives 4 inches", () => {
    expect(wingOrderGap({ run: mm(0) })).toBe(inchesToMm(1 / 2));
    expect(wingOrderGap({ run: inchesToMm(1 / 4) })).toBe(inchesToMm(1 / 2));
    expect(wingOrderGap({ run: inchesToMm(2) })).toBe(2 * inchesToMm(2));
  });

  it("clampWingStations: past the top comes back at the top", () => {
    const [w] = clampWingStations([wing(60, 3 / 16, 1 / 4, 0)], g);
    expect(w.station).toBe(wingPositionTop(g));
  });

  it("clampWingStations: a wing 2 stored nose-ward of wing 1 (the old order) comes back the gap behind it", () => {
    const w1 = wing(11, 3 / 8, 1 / 4, 0);
    const out = clampWingStations([w1, wing(15.5, 1 / 4, 1 / 2, 0)], g);
    expect(out[0]).toBe(w1);
    expect(out[1].station).toBe(w1.station - wingOrderGap(w1));
    expect(Math.abs(mmToInches(out[1].station) - 10.5)).toBeLessThan(1e-9);
  });

  it("clampWingStations: wing 1 at 3 inches with a 2 inch run leaves wing 2 on the 2 inch floor", () => {
    const out = clampWingStations([wing(3, 3 / 8, 2, 0), wing(2.5, 3 / 16, 1 / 2, 0)], g);
    expect(out[1].station).toBe(lo);
  });

  it("clampWingStations: wings already in order come back as the same array", () => {
    const wings = [wing(11, 3 / 8, 1 / 4, 0), wing(8, 3 / 16, 1 / 2, 0)];
    expect(clampWingStations(wings, g)).toBe(wings);
  });

  it("wingPositionRangeForSlot: alone, with a wing 2, wing 2 itself, and no room", () => {
    const topIn = mmToInches(wingPositionTop(g));
    const w1 = wing(11, 3 / 8, 1 / 4, 0);
    const w2 = wing(8, 3 / 16, 1 / 2, 0);
    const gapIn = mmToInches(wingOrderGap(w1));
    expect(wingPositionRangeForSlot([w1], 0, g)).toEqual({ min: WING_POSITION_MIN_IN, max: topIn });
    expect(wingPositionRangeForSlot([w1, w2], 0, g)).toEqual({ min: WING_POSITION_MIN_IN + gapIn, max: topIn });
    const second = wingPositionRangeForSlot([w1, w2], 1, g);
    expect(second.min).toBe(WING_POSITION_MIN_IN);
    expect(Math.abs(second.max - (11 - gapIn))).toBeLessThan(1e-9);
    const cramped = [wing(2.25, 3 / 8, 1 / 4, 0), w2];
    expect(wingPositionRangeForSlot(cramped, 1, g)).toEqual({ min: WING_POSITION_MIN_IN, max: topIn });
    expect(wingOrderState(cramped, g).noRoom).toBe(true);
  });

  it("canAddSecondWing: no at 2 1/4 inches with a 1/4 inch run, yes at 2 1/2", () => {
    expect(canAddSecondWing([wing(2.25, 3 / 16, 1 / 4, 0)], g)).toBe(false);
    expect(canAddSecondWing([wing(2.5, 3 / 16, 1 / 4, 0)], g)).toBe(true);
    expect(canAddSecondWing([], g)).toBe(false);
    expect(canAddSecondWing([wing(11, 3 / 16, 1 / 4, 0), wing(8, 3 / 16, 1 / 2, 0)], g)).toBe(false);
  });
});

describe("the slot locks (D1)", () => {
  const front: Wing = { ...wing(11, 3 / 16, 1 / 4, 0), lock: "front-trailing" };
  const rear: Wing = { ...wing(6, 3 / 16, 1 / 2, 0), lock: "rear-trailing" };

  it("wing 1 holds only the front lock, wing 2 only the rear lock", () => {
    expect(wingLockFitsSlot(0, "front-trailing")).toBe(true);
    expect(wingLockFitsSlot(0, "rear-trailing")).toBe(false);
    expect(wingLockFitsSlot(1, "rear-trailing")).toBe(true);
    expect(wingLockFitsSlot(1, "front-trailing")).toBe(false);
    expect(wingLockFitsSlot(0, null)).toBe(true);
    expect(wingLockFitsSlot(1, null)).toBe(true);
  });

  it("slotWingLocks keeps the same array when every lock fits, and frees a misplaced one at its station", () => {
    const fine = [front, rear];
    expect(slotWingLocks(fine)).toBe(fine);
    const swapped = slotWingLocks([rear, front]);
    expect(swapped.map((w) => w.lock)).toEqual([null, null]);
    expect(swapped[0].station).toBe(rear.station);
  });

  it("removing wing 1 leaves wing 2 as a wing placed by hand at its own station", () => {
    const left = removeWing([front, rear], 0);
    expect(left).toHaveLength(1);
    expect(left[0].lock).toBeNull();
    expect(left[0].station).toBe(rear.station);
  });

  it("wingLockEdge reads the slot's own trailing edge, or nothing", () => {
    const edges = { front: inchesToMm(11), rear: inchesToMm(6.25) };
    expect(wingLockEdge(front, 0, edges)).toBe(edges.front);
    expect(wingLockEdge(rear, 1, edges)).toBe(edges.rear);
    expect(wingLockEdge(rear, 1, { ...edges, rear: null })).toBeNull();
    expect(wingLockEdge(front, 1, edges)).toBeNull();
    expect(wingLockEdge({ lock: null }, 0, edges)).toBeNull();
  });
});

describe("nextWing adds 3/16 inch wings, the second behind the first (D5)", () => {
  it.each(FIN_BOARDS)("$id", ({ outline, fins }) => {
    const g = buildOutline(outline);
    const marks = marksOf(outline, fins);
    const front = marks.find((m) => m.role === "front");
    const rear = marks.find((m) => m.role === "rear");
    const edges = { front: front?.offTail ?? null, rear: rear?.offTail ?? null };
    for (const system of ["imperial", "metric"] as const) {
      const first = nextWing([], edges, g, system);
      expect(first.depth).toBe(inchesToMm(WING_DEFAULT_DEPTH_IN));
      expect(first.run).toBe(inchesToMm(1 / 4));
      expect(first.radius).toBe(0);
      expect(first.station).toBe(front ? front.offTail : inchesToMm(11));
      expect(first.lock).toBe(front ? "front-trailing" : null);

      const second = nextWing([first], edges, g, system);
      expect(second.depth).toBe(inchesToMm(WING_DEFAULT_DEPTH_IN));
      expect(second.run).toBe(inchesToMm(1 / 2));
      expect(second.radius).toBe(wingRadiusTop(second, system));
      const limit = first.station - wingOrderGap(first);
      if (rear) {
        expect(second.lock).toBe("rear-trailing");
        expect(second.station).toBe(Math.min(limit, rear.offTail));
      } else {
        expect(second.lock).toBeNull();
        const byHand = inchesOnGrid(first.station - inchesToMm(WING_SECOND_BY_HAND_IN), system);
        expect(second.station).toBe(byHand);
        expect(second.station).toBeLessThanOrEqual(limit);
      }
      expect(second.station).toBeGreaterThanOrEqual(inchesToMm(WING_POSITION_MIN_IN));
      // Neither opens with the fin-box warning: 3/16" is not deeper than 3/16".
      expect(first.depth).toBeLessThanOrEqual(inchesToMm(3 / 16));
    }
  });

  it("the default board's second wing reads 7 15/16 inches (Imperial) and a whole millimetre (Metric)", () => {
    const g = buildOutline(DEFAULT_BOARD_SPEC.outline);
    const marks = marksOf(DEFAULT_BOARD_SPEC.outline, DEFAULT_FIN_PLACEMENT_SPEC);
    const edges = { front: marks.find((m) => m.role === "front")!.offTail, rear: null };
    const first = nextWing([], edges, g, "imperial");
    const imperial = nextWing([first], edges, g, "imperial");
    expect(Math.abs(mmToInches(imperial.station) - (7 + 15 / 16))).toBeLessThan(1e-9);
    const metric = nextWing([first], edges, g, "metric");
    expect(Number.isInteger(metric.station)).toBe(true);
    expect(metric.station).toBe(Math.floor(first.station - inchesToMm(WING_SECOND_BY_HAND_IN)));
  });

  it("a single fin adds the first wing at 11 inches by hand", () => {
    const longboard = BOARD_PRESETS.find((p) => p.id === "longboard")!;
    const g = buildOutline(longboard.outline);
    const first = nextWing([], NO_FIN_EDGES, g, "imperial");
    expect(first.station).toBe(inchesToMm(11));
    expect(first.lock).toBeNull();
  });

  it("wingFinBoxDistance: 3/8, 1/2 and 1 inch deep want 1/2, 3/4 and 1 3/4 inches", () => {
    for (const [depth, want] of [
      [3 / 8, 1 / 2],
      [1 / 2, 3 / 4],
      [1, 1.75],
    ]) {
      expect(Math.abs(wingFinBoxDistance(inchesToMm(depth)) - inchesToMm(want))).toBeLessThan(1e-9);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// The fins read the step sharp-cornered (quick 261015-u8y, 2026-10-15, D2, D3, P1). The founder:
// "I think the fin placement should be linked to the unrounded outline, so that the rounding has no
// affect on fin placement. It's the wing position that does."
// ---------------------------------------------------------------------------------------------

describe("outlineForFins: the outline the fins read has every wing's corner radius at 0 (D2, D3, P1)", () => {
  const MID = BOARD_PRESETS.find((p) => p.id === "midlength")!;

  /** The Mid-length with the two wings "+ Add a wing" makes: wing 1 sharp, wing 2 rounded to its top. */
  function twoWingBoard(): OutlineSpec {
    const g = buildOutline(MID.outline);
    const marks = marksOf(MID.outline, MID.fins);
    const edges = {
      front: marks.find((m) => m.role === "front")!.offTail,
      rear: marks.find((m) => m.role === "rear")!.offTail,
    };
    const first = nextWing([], edges, g, "imperial");
    const second = nextWing([first], edges, g, "imperial");
    return { ...MID.outline, wings: [first, second] };
  }

  it("hands back the very same object when there is nothing to sharpen (D3)", () => {
    for (const outline of [DEFAULT_BOARD_SPEC.outline, ...BOARD_PRESETS.map((p) => p.outline)]) {
      expect(outlineForFins(outline)).toBe(outline);
    }
    const empty: OutlineSpec = { ...DEFAULT_BOARD_SPEC.outline, wings: [] };
    expect(outlineForFins(empty)).toBe(empty);
    const board = twoWingBoard();
    const bothSharp: OutlineSpec = { ...board, wings: board.wings!.map((w) => ({ ...w, radius: mm(0) })) };
    expect(outlineForFins(bothSharp)).toBe(bothSharp);
  });

  it("copies the outline with each rounded wing's radius at 0, every other field kept, never mutating the input", () => {
    const board = twoWingBoard();
    const [first, second] = board.wings!;
    expect(second.radius).toBeGreaterThan(0);
    const sharpened = outlineForFins(board);
    expect(sharpened).not.toBe(board);
    expect(sharpened.wings![0]).toBe(first);
    expect(sharpened.wings![1]).toEqual({ ...second, radius: mm(0) });
    expect({ ...sharpened, wings: undefined }).toEqual({ ...board, wings: undefined });
    expect(board.wings![1]).toBe(second);
    expect(second.radius).toBe(wingRadiusTop(second, "imperial"));
  });

  it("a radius that is not a number already draws sharp, so it counts as sharp (T-u8y-01)", () => {
    const board = twoWingBoard();
    const odd: OutlineSpec = { ...board, wings: board.wings!.map((w) => ({ ...w, radius: mm(Number.NaN) })) };
    expect(outlineForFins(odd)).toBe(odd);
  });
});
