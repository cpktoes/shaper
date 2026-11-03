/**
 * The finished rail (quick 261102-gec, R13; the founder's pick of "Blended halfway" over "One even round",
 * 2026-11-02, sketch 018; plan 05's deck corner, R23, and Sharp Bottom Edge, R22).
 *
 * Every expected number here is the reference page's own (lib/geometry/__fixtures__/rails-v2-golden.json,
 * written by scripts/extract-rails-v2-golden.ts executing reference/sketches/018-chris-rails-v2.js), the
 * app's own output (today's curve is `finishedRailFromCuts` with no Domed Deck Band — the page's own rule)
 * or a relation between them — a third, Green's theorem, a cross product, a midpoint, equal bends, a lerp —
 * never a typed coordinate, area or radius (Rule 1, the plan's M12). The only typed figures are the
 * founder's own (rule 12's 2", the ±2" dome window in 1/16" steps, Deck Profile 90 and 75) and tolerances.
 */
import { describe, expect, it } from "vitest";
import type { Point2D } from "./board";
import {
  DECK_BLEND_MAX_REACH_IN,
  cubicArea,
  cubicBlendArea,
  deckBlendWeight,
  finishedRail,
  finishedRailFromCuts,
  finishedRailPath,
  matchedDomeReach,
  railBlendArea,
  railCutFoam,
  sectionFinishedRail,
  type FinishedRail,
  type FinishedRailOptions,
  type FinishedRailStep,
  type RailCutLine,
} from "./finished-rail";
import {
  DECK_PERCENT_MIN,
  DEFAULT_RAIL_BAND_SPEC,
  RAIL_NUDGE_LIMIT_IN,
  RAIL_NUDGE_STEP_IN,
  ZERO_RAIL_NUDGES,
  computeRailSectionOutput,
  type RailFamily,
  type RailSectionKey,
  type RailSectionSpec,
} from "./rail-bands";
import { BOARD_PRESETS } from "./presets";
import golden from "./__fixtures__/rails-v2-golden.json";
import { inchesToMm, mm, mmToInches } from "./units";

type Pt = number[];
interface GoldenSegment {
  key: string;
  p1: Pt;
  p2: Pt;
}
interface GoldenEntry {
  input: { T: number; deck: number; F: number; top: number; sym: boolean; scale: number };
  sheet: { domed: boolean; bt: number; apexCenter: number; rm1: number; domeBand: number };
  segments: GoldenSegment[];
}

const workbook = golden.workbook as unknown as GoldenEntry[];
const cases = golden.cases as unknown as GoldenEntry[];
const everyEntry: GoldenEntry[] = [...workbook, ...cases];

/** The section's own plot edge (rule 12): 2" beyond the Domed Deck Band, 2.4 x the board thickness. */
const x0InchesFor = (entry: GoldenEntry) => -(2.4 * entry.input.T + 2);

type In = [number, number];
const toMm = (p: Pt): Point2D => ({ x: inchesToMm(p[0]), y: inchesToMm(p[1]) });
const inches = (p: Point2D): In => [mmToInches(p.x), mmToInches(p.y)];
const dist = (a: In, b: In) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const sub = (a: In, b: In): In => [a[0] - b[0], a[1] - b[1]];
const crossIn = (a: In, b: In) => a[0] * b[1] - a[1] * b[0];
const unitIn = (a: In): In => [a[0] / Math.hypot(a[0], a[1]), a[1] / Math.hypot(a[0], a[1])];
/** The cross product of two directions, each made a unit first: the sine of the angle between them. */
const sinBetween = (a: In, b: In) => crossIn(unitIn(a), unitIn(b));
const nearIn = (a: In, b: In, tol = 1e-9) => Math.abs(a[0] - b[0]) < tol && Math.abs(a[1] - b[1]) < tol;
const along = (from: In, dir: In, d: number): In => [from[0] + dir[0] * d, from[1] + dir[1] * d];

/** The page's own cut lines for one case: the dome only when the deck is domed, the four bands, any
 * line shorter than a millionth of an inch dropped — exactly what its `cuts(r)` keeps. */
function cutsFor(entry: GoldenEntry, keys: readonly string[] = ["domed", "band1", "band2", "tuck1", "tuck2"]): RailCutLine[] {
  return entry.segments
    .filter((s) => keys.includes(s.key) && (s.key !== "domed" || entry.sheet.domed))
    .filter((s) => Math.hypot(s.p1[0] - s.p2[0], s.p1[1] - s.p2[1]) > 1e-6)
    .map((s) => ({ p1: toMm(s.p1), p2: toMm(s.p2) }));
}

/** The case's own Domed Deck Band, which turns on the founder's deck-corner rule (plan 05, PC36). */
const domeOf = (entry: GoldenEntry, extra: FinishedRailOptions = {}): FinishedRailOptions => ({
  domedDeckBand: inchesToMm(entry.sheet.domeBand),
  ...extra,
});

function finishedFor(
  entry: GoldenEntry,
  hardEdge = false,
  keys?: readonly string[],
  options?: FinishedRailOptions,
): FinishedRail {
  return finishedRailFromCuts(
    cutsFor(entry, keys),
    inchesToMm(entry.sheet.bt),
    inchesToMm(x0InchesFor(entry)),
    hardEdge,
    options,
  );
}

/** True when `p` lies inside or on the convex foam polygon (a signed side test on every edge, each
 * normalised to a distance so the tolerance is in inches). */
function insideFoam(poly: In[], p: In, tolIn: number): boolean {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const orient = Math.sign(area) || 1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-12) continue;
    const side = ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / len;
    if (side * orient < -tolIn) return false;
  }
  return true;
}

type XY = { x: number; y: number };
const quadAt = (A: XY, V: XY, B: XY, t: number): [number, number] => [
  (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * V.x + t * t * B.x,
  (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * V.y + t * t * B.y,
];
const cubicAt = (P0: XY, P1: XY, P2: XY, P3: XY, t: number): [number, number] => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * P0.x + b * P1.x + c * P2.x + d * P3.x, a * P0.y + b * P1.y + c * P2.y + d * P3.y];
};

describe("finishedRailFromCuts — agreement with the reference page (R13 d)", () => {
  it("draws every recorded finished rail with the page's own sample count and every sample within a millionth of an inch", () => {
    expect(golden.finished.length).toBeGreaterThan(0);
    for (const curve of golden.finished) {
      const entry =
        "workbook" in curve.source
          ? workbook.find((w) => (w as unknown as { key: string }).key === (curve.source as { workbook: string }).workbook)!
          : cases[(curve.source as { case: number }).case];
      expect(entry.input).toEqual(curve.input);
      const rail = finishedRailFromCuts(
        cutsFor(entry),
        inchesToMm(entry.sheet.bt),
        inchesToMm(curve.x0),
        false,
      );
      expect(rail.samples.length, curve.label).toBe(curve.points.length);
      rail.samples.forEach((p, i) => {
        const [x, y] = inches(p);
        expect(Math.abs(x - curve.points[i][0]), `${curve.label} sample ${i} x`).toBeLessThan(1e-6);
        expect(Math.abs(y - curve.points[i][1]), `${curve.label} sample ${i} y`).toBeLessThan(1e-6);
      });
    }
  });
});

/** The golden entry a recorded finished curve was drawn from. */
function entryOfCurve(curve: (typeof golden.finished)[number]): GoldenEntry {
  return "workbook" in curve.source
    ? workbook.find((w) => (w as unknown as { key: string }).key === (curve.source as { workbook: string }).workbook)!
    : cases[(curve.source as { case: number }).case];
}

/** The app's own rail-section spec for a golden input. */
function specFor(input: GoldenEntry["input"], extra: Partial<RailSectionSpec> = {}): RailSectionSpec {
  const { T, deck, F, top, sym, scale } = input;
  return {
    boardThickness: inchesToMm(T),
    deckPercent: deck,
    family: F as RailFamily,
    ratioTopPercent: top,
    symmetrical: sym,
    cornerCutOffsetOverride: null,
    removeCornerCut: false,
    singleTuck: false,
    sharpBottomEdge: false,
    bottomTuck3Override: null,
    scaleFromCenter: scale,
    nudges: ZERO_RAIL_NUDGES,
    ...extra,
  };
}

describe("finishedRail — end to end, from the app's own rail section (quick 261102-gec; plan 05, PC42)", () => {
  it("matches the page's samples from Band 2's middle on, sample for sample within a millionth of an inch, and at its start", () => {
    for (const curve of golden.finished) {
      const entry = entryOfCurve(curve);
      const output = computeRailSectionOutput(curve.input.scale === 1 ? "center" : "nose", specFor(curve.input), false);
      // The drawing's own left edge (rule 12) is the page's x0.
      expect(Math.abs(mmToInches(output.bounds.xAxisMin) - curve.x0)).toBeLessThan(1e-9);
      const rail = finishedRail(output, inchesToMm(curve.x0));
      const ours = rail.samples.map(inches);
      const page = curve.points as In[];
      // The start sample is the deck end at the drawing's edge, on both.
      expect(nearIn(ours[0], page[0], 1e-6), curve.label).toBe(true);
      // Band 2's middle, from the case's own band2 segment: everything from there on is the halfway blend.
      const band2 = entry.segments.find((s) => s.key === "band2")!;
      const mid: In = [(band2.p1[0] + band2.p2[0]) / 2, (band2.p1[1] + band2.p2[1]) / 2];
      const iOurs = ours.findIndex((p) => nearIn(p, mid, 1e-7));
      const iPage = page.findIndex((p) => nearIn(p, mid, 1e-7));
      expect(iOurs, curve.label).toBeGreaterThan(0);
      expect(iPage, curve.label).toBeGreaterThan(0);
      expect(ours.length - iOurs, curve.label).toBe(page.length - iPage);
      for (let k = 0; iOurs + k < ours.length; k++) {
        expect(nearIn(ours[iOurs + k], page[iPage + k], 1e-6), `${curve.label} sample ${iOurs + k}`).toBe(true);
      }
    }
  });
});

describe("finishedRailFromCuts — never outside a cut (R13 a), with the deck rule and the sharp bottom edge", () => {
  it("keeps every sample inside or on the foam the cuts leave, on the workbook's sets and every grid case, plain and with Sharp Bottom Edge", () => {
    // About 340,000 samples: every one outside is collected and asserted once.
    const outside: string[] = [];
    for (const entry of everyEntry) {
      const cuts = cutsFor(entry);
      const bt = inchesToMm(entry.sheet.bt);
      const x0 = inchesToMm(x0InchesFor(entry));
      const foam = railCutFoam(cuts, bt, x0).map(inches);
      for (const sharpBottomEdge of [false, true]) {
        const rail = finishedRailFromCuts(cuts, bt, x0, false, domeOf(entry, { sharpBottomEdge }));
        rail.samples.forEach((p, i) => {
          if (!insideFoam(foam, inches(p), 1e-9)) outside.push(`${JSON.stringify(entry.input)} sharp ${sharpBottomEdge} sample ${i}`);
        });
      }
    }
    expect(outside).toEqual([]);
  }, 60_000);

  it("and with Single Tuck (with and without Sharp Bottom Edge), from the app's own section", () => {
    const outside: string[] = [];
    for (const entry of everyEntry) {
      for (const variant of [{ singleTuck: true }, { singleTuck: true, sharpBottomEdge: true }]) {
        const output = appSection(entry, variant);
        const foam = railCutFoam(appCuts(output), output.boardThickness, output.bounds.xAxisMin).map(inches);
        const rail = sectionFinishedRail(output.result, output.domed);
        rail.samples.forEach((p, i) => {
          if (!insideFoam(foam, inches(p), 1e-9)) outside.push(`${variantLabel(entry, variant)} sample ${i}`);
        });
      }
    }
    expect(outside).toEqual([]);
  }, 60_000);
});

describe("finishedRailFromCuts — meets the rail only at the Apex Center (R13 b)", () => {
  it("on every tucked case, plain, with Sharp Bottom Edge and with Single Tuck, the only samples on the rail line sit at that case's Apex Center", () => {
    for (const entry of everyEntry) {
      const rails = [
        finishedFor(entry, false, undefined, domeOf(entry)),
        finishedFor(entry, false, undefined, domeOf(entry, { sharpBottomEdge: true })),
        sectionFinishedRail(appSection(entry, { singleTuck: true }).result, appSection(entry, { singleTuck: true }).domed),
      ];
      for (const rail of rails) {
        const onRail = rail.samples.map(inches).filter(([x]) => x >= -1e-9);
        expect(onRail.length).toBeGreaterThan(0);
        for (const [, y] of onRail) expect(Math.abs(y - entry.sheet.apexCenter)).toBeLessThan(1e-9);
      }
    }
  });
});

describe("finishedRailFromCuts — a hard edge keeps its corner sharp (R13 c; the Apex Center rule does not apply to a hard edge)", () => {
  it("leaves the wall at half of Rail Mark 1, runs straight down the wall to the bottom corner, then straight along the bottom", () => {
    for (const entry of everyEntry) {
      const x0 = inchesToMm(x0InchesFor(entry));
      const rail = finishedFor(entry, true, ["domed", "band1", "band2"], domeOf(entry));
      const steps = rail.steps;
      const last = steps[steps.length - 1];
      const corner = steps[steps.length - 2];
      const wallLeave = steps[steps.length - 3];
      // The last blended corner ends on the rail wall at half that case's Rail Mark 1.
      expect(wallLeave.kind).toBe("quad");
      const [wx, wy] = inches(wallLeave.to);
      expect(Math.abs(wx)).toBeLessThan(1e-9);
      expect(Math.abs(wy - entry.sheet.rm1 / 2)).toBeLessThan(1e-9);
      // A straight line down x = 0 to exactly the bottom corner …
      expect(corner).toEqual({ kind: "line", to: { x: 0, y: 0 } });
      // … and a straight line along the bottom to the drawing's left edge.
      expect(last.kind).toBe("line");
      expect(last.to.y).toBe(0);
      expect(Math.abs(mmToInches(last.to.x) - mmToInches(x0))).toBeLessThan(1e-9);
      // The corner is sampled once, sharp — no blend leaves it.
      const tail = rail.samples.slice(-2).map(inches);
      expect(tail[0][0]).toBe(0);
      expect(tail[0][1]).toBe(0);
      // Sharp Bottom Edge changes nothing on a hard edge: its last corner is sharp already (PC38).
      expect(finishedFor(entry, true, ["domed", "band1", "band2"], domeOf(entry, { sharpBottomEdge: true }))).toEqual(rail);
    }
  });
});

/** Rebuilds a rail's samples from its steps: 17 even parameters per quad and per cubic, and each lone
 * line's end. */
function rebuildSamples(rail: FinishedRail): [number, number][] {
  const rebuilt: [number, number][] = [[rail.start.x, rail.start.y]];
  let at: XY = rail.start;
  rail.steps.forEach((step, i) => {
    if (step.kind === "quad") {
      for (let s = 0; s <= 16; s++) rebuilt.push(quadAt(at, step.control, step.to, s / 16));
    } else if (step.kind === "cubic") {
      for (let s = 0; s <= 16; s++) rebuilt.push(cubicAt(at, step.c1, step.c2, step.to, s / 16));
    } else if (rail.steps[i + 1]?.kind === "line" || i === rail.steps.length - 1) {
      rebuilt.push([step.to.x, step.to.y]);
    }
    at = step.to;
  });
  return rebuilt;
}

describe("finishedRailFromCuts — the steps draw the samples", () => {
  it("re-sampling every quad and cubic step at 17 even parameters reproduces the samples, and every lone line ends on a chain corner", () => {
    for (const entry of [...workbook, ...cases.filter((_, i) => i % 7 === 0)]) {
      for (const variant of ["plain", "hard", "page", "sharp"] as const) {
        const rail =
          variant === "hard"
            ? finishedFor(entry, true, ["domed", "band1", "band2"], domeOf(entry))
            : variant === "page"
              ? finishedFor(entry)
              : finishedFor(entry, false, undefined, domeOf(entry, { sharpBottomEdge: variant === "sharp" }));
        rail.steps.forEach((step, i) => {
          const next = rail.steps[i + 1];
          if (step.kind === "line" && (next === undefined || next.kind === "line")) {
            expect(rail.chain.some((c) => c.x === step.to.x && c.y === step.to.y)).toBe(true);
          }
        });
        const rebuilt = rebuildSamples(rail);
        expect(rebuilt.length).toBe(rail.samples.length);
        rebuilt.forEach(([x, y], i) => {
          expect(Math.abs(x - rail.samples[i].x)).toBeLessThan(1e-9);
          expect(Math.abs(y - rail.samples[i].y)).toBeLessThan(1e-9);
        });
        expect(rail.start).toEqual(rail.chain[0]);
      }
    }
  }, 30_000);
});

describe("finishedRailPath — the drawn path (quick 261102-gec plan 02, PC22; plan 05's C)", () => {
  /** A plain affine map built from the case's own numbers: the left edge at 0, the deck at 0, y down —
   * the shape a plot's own projection has. Nothing typed but the map's form. */
  function projectionFor(rail: FinishedRail) {
    const left = rail.chain[0].x;
    const top = rail.chain[0].y;
    const k = 1 / top;
    return (p: Point2D) => ({ x: (p.x - left) * k, y: (top - p.y) * k });
  }

  /** Splits a path into its commands, each with its numbers. */
  function commands(d: string): { op: string; nums: number[] }[] {
    return [...d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)].map((m) => ({
      op: m[1],
      nums: m[2].trim() === "" ? [] : m[2].trim().split(/\s+/).map(Number),
    }));
  }

  it("starts with M at the projected start, then one L per line step, one Q per blend and one C per cubic, in order, every point projected", () => {
    let cubics = 0;
    for (const entry of [...workbook, ...cases.filter((_, i) => i % 50 === 0)]) {
      for (const hardEdge of [false, true]) {
        const rail = hardEdge
          ? finishedFor(entry, true, ["domed", "band1", "band2"], domeOf(entry))
          : finishedFor(entry, false, undefined, domeOf(entry));
        const project = projectionFor(rail);
        const cmds = commands(finishedRailPath(rail, project));
        expect(cmds[0].op).toBe("M");
        const start = project(rail.start);
        expect(cmds[0].nums).toEqual([start.x, start.y]);
        expect(cmds.length).toBe(rail.steps.length + 1);
        rail.steps.forEach((step, i) => {
          const cmd = cmds[i + 1];
          const to = project(step.to);
          if (step.kind === "line") {
            expect(cmd.op).toBe("L");
            expect(cmd.nums).toEqual([to.x, to.y]);
          } else if (step.kind === "quad") {
            const c = project(step.control);
            expect(cmd.op).toBe("Q");
            expect(cmd.nums).toEqual([c.x, c.y, to.x, to.y]);
          } else {
            const c1 = project(step.c1);
            const c2 = project(step.c2);
            expect(cmd.op).toBe("C");
            expect(cmd.nums).toEqual([c1.x, c1.y, c2.x, c2.y, to.x, to.y]);
            cubics++;
          }
        });
        for (const [op, kind] of [
          ["Q", "quad"],
          ["L", "line"],
          ["C", "cubic"],
        ] as const) {
          expect(cmds.filter((c) => c.op === op).length).toBe(rail.steps.filter((s) => s.kind === kind).length);
        }
      }
    }
    expect(cubics).toBeGreaterThan(0);
  });

  it("closed: the same path plus Z, which closes along the drawing's left edge from the bottom's end to the deck's", () => {
    for (const entry of workbook) {
      const rail = finishedFor(entry, false, undefined, domeOf(entry));
      const project = projectionFor(rail);
      const open = finishedRailPath(rail, project);
      const closed = finishedRailPath(rail, project, { closed: true });
      expect(closed).toBe(`${open} Z`);
      // The close runs from the chain's last point (on the bottom) to its first (on the deck), both on
      // the left edge: one straight line up the drawing's edge.
      const first = rail.chain[0];
      const last = rail.chain[rail.chain.length - 1];
      expect(Math.abs(last.x - first.x)).toBeLessThan(1e-9);
      expect(Math.abs(last.y)).toBeLessThan(1e-9);
      expect(first.y).toBeGreaterThan(last.y);
      const lastStep = rail.steps[rail.steps.length - 1];
      expect(lastStep.kind).toBe("line");
      expect(lastStep.to).toEqual(last);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Plan 05's deck corner (R23, PC35 — the founder's (d), "with the hand-over made continuous first",
// 2026-11-02). Every figure below is worked out from the case's own cut outline.
// ---------------------------------------------------------------------------------------------

/** The deck corner's points, read off a rail's own cut outline exactly as PC36 describes them (inches):
 * the dome mark D, Deck Mark 3's corner V, the Deck Mark 2 corner N, Band 2's middle A, half of Band 2
 * L and the run m. */
function deckGeometry(rail: FinishedRail, domeIn: number) {
  const chain = rail.chain.map(inches);
  const bt = chain[0][1];
  const Dmark: In = [-domeIn, bt];
  const domed = nearIn(chain[1], Dmark, 1e-6) && chain[2][1] < bt - 1e-6;
  const iV = domed ? 2 : 1;
  const V = chain[iV];
  const N = chain[iV + 1];
  const D = domed ? chain[1] : Dmark;
  const A: In = [(V[0] + N[0]) / 2, (V[1] + N[1]) / 2];
  const edge = chain[0];
  const L = dist(V, A);
  const m = dist(D, V);
  const toEdge = unitIn(sub(edge, D));
  const u = unitIn(sub(V, D));
  return { chain, bt, domed, V, N, D, A, L, m, edge, toEdge, u, room: dist(edge, D) };
}

/** The steps from the deck end to Band 2's middle — the deck side of the curve. */
function deckSide(rail: FinishedRail, A: In): FinishedRailStep[] {
  const i = rail.steps.findIndex((s) => s.kind !== "line" && nearIn(inches(s.to), A, 1e-9));
  expect(i).toBeGreaterThan(0);
  return rail.steps.slice(0, i + 1);
}

/** (b), the matched blends, worked out from the case's own points with `matchedDomeReach` (inches). */
function matchedBlends(g: ReturnType<typeof deckGeometry>) {
  const sinDome = Math.abs(crossIn([-g.toEdge[0], -g.toEdge[1]], g.u));
  const sinV = Math.abs(sinBetween(g.u, sub(g.A, g.V)));
  const rMatch = matchedDomeReach(g.m, sinDome, g.L, sinV);
  const s = Math.min(g.L, g.m - rMatch);
  const r = Math.min(g.m - s, DECK_BLEND_MAX_REACH_IN, g.room);
  return {
    r,
    s,
    sinDome,
    sinV,
    Fb: along(g.D, g.toEdge, r),
    Q1: along(g.D, g.u, r),
    Q2: along(g.D, g.u, g.m - s),
  };
}

/** The tightest radius of a run of steps (inches), each parabola sampled at 65 parameters and each cubic
 * at 401; a straight step never bends. */
function tightestRadius(start: XY, steps: readonly FinishedRailStep[]): number {
  let min = Infinity;
  let at = inches(start as Point2D);
  for (const step of steps) {
    const to = inches(step.to);
    if (step.kind === "quad") {
      const c = inches(step.control);
      const dd: In = [2 * (to[0] - 2 * c[0] + at[0]), 2 * (to[1] - 2 * c[1] + at[1])];
      for (let k = 0; k <= 64; k++) {
        const t = k / 64;
        const d: In = [2 * ((1 - t) * (c[0] - at[0]) + t * (to[0] - c[0])), 2 * ((1 - t) * (c[1] - at[1]) + t * (to[1] - c[1]))];
        const kappa = Math.abs(crossIn(d, dd)) / Math.hypot(d[0], d[1]) ** 3;
        if (kappa > 0) min = Math.min(min, 1 / kappa);
      }
    } else if (step.kind === "cubic") {
      const p1 = inches(step.c1);
      const p2 = inches(step.c2);
      for (let k = 0; k <= 400; k++) {
        const t = k / 400;
        const u = 1 - t;
        const d: In = [
          3 * (u * u * (p1[0] - at[0]) + 2 * u * t * (p2[0] - p1[0]) + t * t * (to[0] - p2[0])),
          3 * (u * u * (p1[1] - at[1]) + 2 * u * t * (p2[1] - p1[1]) + t * t * (to[1] - p2[1])),
        ];
        const dd: In = [
          6 * (u * (p2[0] - 2 * p1[0] + at[0]) + t * (to[0] - 2 * p2[0] + p1[0])),
          6 * (u * (p2[1] - 2 * p1[1] + at[1]) + t * (to[1] - 2 * p2[1] + p1[1])),
        ];
        const kappa = Math.abs(crossIn(d, dd)) / Math.hypot(d[0], d[1]) ** 3;
        if (kappa > 0) min = Math.min(min, 1 / kappa);
      }
    }
    at = to;
  }
  return min;
}

/** A cubic step's control points as one list from its start (inches). */
const mmPt = (p: In): Point2D => ({ x: mm(inchesToMm(p[0])), y: mm(inchesToMm(p[1])) });

describe("the deck corner, at each end of the hand-over (plan 05, R23, PC35)", () => {
  it("a short run (no longer than half of Band 2) is one line to the deck beyond the dome mark, then one cubic over the dome mark and Deck Mark 3 to Band 2's middle", () => {
    let short = 0;
    let flatShort = 0;
    for (const entry of everyEntry) {
      const rail = finishedFor(entry, false, undefined, domeOf(entry));
      const g = deckGeometry(rail, entry.sheet.domeBand);
      if (g.m > g.L) continue;
      short++;
      expect(deckBlendWeight(g.m, g.L)).toBe(0);
      const [line, cubic] = rail.steps;
      const label = JSON.stringify(entry.input);
      expect(line.kind, label).toBe("line");
      expect(cubic.kind, label).toBe("cubic");
      if (cubic.kind !== "cubic") continue;
      // Fd: on the deck, min(L, 2", the edge) beyond the dome mark.
      const Fd = along(g.D, g.toEdge, Math.min(g.L, DECK_BLEND_MAX_REACH_IN, g.room));
      expect(nearIn(inches(line.to), Fd), label).toBe(true);
      expect(nearIn(inches(cubic.c1), g.D), label).toBe(true);
      expect(nearIn(inches(cubic.c2), g.V), label).toBe(true);
      expect(nearIn(inches(cubic.to), g.A), label).toBe(true);
      if (!g.domed) {
        flatShort++;
        // On a flat deck Fd, the dome mark and Deck Mark 3 lie on one line: no bend where it leaves the deck.
        expect(Math.abs(crossIn(sub(g.D, Fd), sub(g.V, g.D))), label).toBeLessThan(1e-9);
      }
    }
    expect(short).toBeGreaterThan(0);
    expect(flatShort).toBeGreaterThan(0);
  });

  it("a long run (at least all of Band 2) is the matched blends on a domed deck — bending alike where they meet — and today's curve on a flat one", () => {
    let domedLong = 0;
    let flatLong = 0;
    let matched = 0;
    for (const entry of everyEntry) {
      const rail = finishedFor(entry, false, undefined, domeOf(entry));
      const g = deckGeometry(rail, entry.sheet.domeBand);
      if (g.m < 2 * g.L) continue;
      expect(deckBlendWeight(g.m, g.L)).toBe(1);
      const label = JSON.stringify(entry.input);
      if (!g.domed) {
        flatLong++;
        expect(rail, label).toEqual(finishedFor(entry));
        continue;
      }
      domedLong++;
      const b = matchedBlends(g);
      const [l0, q0, l1, q1] = rail.steps;
      expect([l0.kind, q0.kind, l1.kind, q1.kind], label).toEqual(["line", "quad", "line", "quad"]);
      if (q0.kind !== "quad" || q1.kind !== "quad") continue;
      expect(nearIn(inches(l0.to), b.Fb), label).toBe(true);
      expect(nearIn(inches(q0.control), g.D), label).toBe(true);
      expect(nearIn(inches(q0.to), b.Q1), label).toBe(true);
      expect(nearIn(inches(l1.to), b.Q2), label).toBe(true);
      expect(nearIn(inches(q1.control), g.V), label).toBe(true);
      expect(nearIn(inches(q1.to), g.A), label).toBe(true);
      // Even legs on the dome blend; the Deck Mark 3 blend's dome-side leg s.
      expect(Math.abs(dist(b.Fb, g.D) - dist(g.D, b.Q1)), label).toBeLessThan(1e-9);
      expect(Math.abs(dist(b.Q2, g.V) - b.s), label).toBeLessThan(1e-9);
      if (b.r < DECK_BLEND_MAX_REACH_IN - 1e-9 && b.s < g.L - 1e-9) {
        matched++;
        // The two blends meet at one point and bend alike there: a parabola leaves its end with a bend of
        // |leg out| sin(turn) / 2|leg in|², read off each blend's own legs.
        expect(nearIn(b.Q1, b.Q2), label).toBe(true);
        const domeBend = (dist(b.Fb, g.D) * b.sinDome) / (2 * dist(g.D, b.Q1) ** 2);
        const deckMark3Bend = (dist(g.V, g.A) * b.sinV) / (2 * dist(b.Q2, g.V) ** 2);
        expect(Math.abs(domeBend - deckMark3Bend) / deckMark3Bend, label).toBeLessThan(1e-6);
      }
    }
    expect(domedLong).toBeGreaterThan(0);
    expect(flatLong).toBeGreaterThan(0);
    expect(matched).toBeGreaterThan(0);
  });
});

/** The rails the continuity sweep runs over: the first board's centre and tail and the Shortboard's tail. */
const shortboard = BOARD_PRESETS.find((p) => p.name === "Shortboard")!;
const SWEEP_RAILS: readonly { label: string; key: RailSectionKey; spec: RailSectionSpec; hardEdge: boolean }[] = [
  { label: "first board centre", key: "center", spec: DEFAULT_RAIL_BAND_SPEC.center, hardEdge: false },
  { label: "first board tail", key: "tail", spec: DEFAULT_RAIL_BAND_SPEC.tail, hardEdge: DEFAULT_RAIL_BAND_SPEC.tailHardEdge },
  { label: "Shortboard tail", key: "tail", spec: shortboard.rails.tail, hardEdge: shortboard.rails.tailHardEdge },
];
/** The founder's window: the Domed Deck Band nudged ±2" in 1/16" steps (65 positions). */
const DOME_STEPS = Math.round(RAIL_NUDGE_LIMIT_IN.domedDeckBand / RAIL_NUDGE_STEP_IN);

interface SweepPosition {
  label: string;
  output: ReturnType<typeof computeRailSectionOutput>;
  rail: FinishedRail;
  today: FinishedRail;
}

/** Every rail of the sweep at Deck Profile 100 and 90, the dome stepped across its window, each drawn
 * from one fixed left edge per rail (the widest, at +2"), with today's curve beside it. */
function sweep(): SweepPosition[][] {
  const runs: SweepPosition[][] = [];
  for (const r of SWEEP_RAILS) {
    for (const deckPercent of [100, 90]) {
      const outputs = Array.from({ length: 2 * DOME_STEPS + 1 }, (_, k) =>
        computeRailSectionOutput(
          r.key,
          {
            ...r.spec,
            deckPercent,
            nudges: { ...ZERO_RAIL_NUDGES, domedDeckBand: inchesToMm((k - DOME_STEPS) * RAIL_NUDGE_STEP_IN) },
          },
          r.hardEdge,
        ),
      );
      const x0 = mm(Math.min(...outputs.map((o) => o.bounds.xAxisMin)));
      runs.push(
        outputs.map((output, k) => ({
          label: `${r.label} @ ${deckPercent}% dome ${k - DOME_STEPS}/16"`,
          output,
          rail: finishedRail(output, x0),
          today: finishedRailFromCuts(appCuts(output), output.boardThickness, x0, output.result.hardEdge),
        })),
      );
    }
  }
  return runs;
}

/** The curve as a dense polyline (inches), every curved step cut into `n` pieces. */
function polyline(rail: FinishedRail, n = 32): In[] {
  return resampled(rail, n).map(inches);
}

/** The farthest any point of `a` lies from the polyline `b` (inches). */
function farthestFrom(a: In[], b: In[]): number {
  let worst = 0;
  for (const p of a) {
    let best = Infinity;
    for (let i = 0; i + 1 < b.length; i++) {
      const q = b[i];
      const d = sub(b[i + 1], q);
      const len2 = d[0] * d[0] + d[1] * d[1];
      const t = len2 > 0 ? Math.min(1, Math.max(0, ((p[0] - q[0]) * d[0] + (p[1] - q[1]) * d[1]) / len2)) : 0;
      best = Math.min(best, Math.hypot(p[0] - q[0] - t * d[0], p[1] - q[1] - t * d[1]));
      if (best === 0) break;
    }
    worst = Math.max(worst, best);
  }
  return worst;
}
const moveBetween = (a: FinishedRail, b: FinishedRail) => {
  const pa = polyline(a);
  const pb = polyline(b);
  return Math.max(farthestFrom(pa, pb), farthestFrom(pb, pa));
};

describe("the deck corner never jumps as the Domed Deck Band slider moves (plan 05, R23, M26)", () => {
  const runs = sweep();

  it("per 1/16\" step the drawn line moves no more than today's own curve does on the same sweep (plus 0.05 mm)", () => {
    let worstNew = 0;
    let worstToday = 0;
    let where = "";
    for (const run of runs) {
      for (let k = 1; k < run.length; k++) {
        const moved = moveBetween(run[k - 1].rail, run[k].rail);
        if (moved > worstNew) {
          worstNew = moved;
          where = run[k].label;
        }
        worstToday = Math.max(worstToday, moveBetween(run[k - 1].today, run[k].today));
      }
    }
    expect(worstToday).toBeGreaterThan(0);
    expect(inchesToMm(worstNew), where).toBeLessThanOrEqual(inchesToMm(worstToday) + 0.05);
  }, 120_000);

  it("inside the hand-over the deck side never bends tighter than the tighter of its two ends at the same position", () => {
    let inside = 0;
    for (const run of runs) {
      for (const pos of run) {
        const domeIn = mmToInches(pos.output.result.domedDeckBand);
        const g = deckGeometry(pos.rail, domeIn);
        const w = deckBlendWeight(g.m, g.L);
        if (w <= 0 || w >= 1) continue;
        inside++;
        const mid = tightestRadius(pos.rail.start, deckSide(pos.rail, g.A));
        // (d) at that run: one cubic from Fd over D and V to A.
        const Fd = along(g.D, g.toEdge, Math.min(g.L, DECK_BLEND_MAX_REACH_IN, g.room));
        const dEnd = tightestRadius(mmPt(g.edge), [
          { kind: "line", to: mmPt(Fd) },
          { kind: "cubic", c1: mmPt(g.D), c2: mmPt(g.V), to: mmPt(g.A) },
        ]);
        // (b) on a domed deck, today's blend on a flat one.
        let bEnd: number;
        if (g.domed) {
          const b = matchedBlends(g);
          bEnd = tightestRadius(mmPt(g.edge), [
            { kind: "line", to: mmPt(b.Fb) },
            { kind: "quad", control: mmPt(g.D), to: mmPt(b.Q1) },
            { kind: "line", to: mmPt(b.Q2) },
            { kind: "quad", control: mmPt(g.V), to: mmPt(g.A) },
          ]);
        } else {
          bEnd = tightestRadius(pos.today.start, deckSide(pos.today, g.A));
        }
        expect(mid, pos.label).toBeGreaterThanOrEqual(Math.min(dEnd, bEnd) * (1 - 1e-6));
      }
    }
    expect(inside).toBeGreaterThan(0);
  }, 60_000);

  it("at every position the curve leaves the deck along the deck, meets Band 2 along Band 2, and is smooth where its two domed pieces join", () => {
    let joins = 0;
    for (const run of runs) {
      for (const pos of run) {
        const g = deckGeometry(pos.rail, mmToInches(pos.output.result.domedDeckBand));
        const side = deckSide(pos.rail, g.A);
        const deckDir = sub(g.D, g.edge);
        const band2Dir = sub(g.N, g.V);
        // The first leg: the line to the curve's start, then its first guide point, both on the deck line.
        const first = side[1];
        const firstGuide = first.kind === "cubic" ? first.c1 : first.kind === "quad" ? first.control : first.to;
        expect(Math.abs(sinBetween(sub(inches(side[0].to), g.edge), deckDir)), pos.label).toBeLessThan(1e-9);
        expect(Math.abs(crossIn(sub(inches(firstGuide), g.edge), unitIn(deckDir))), pos.label).toBeLessThan(1e-9);
        // The last leg: the last guide point and Band 2's middle on Band 2's line.
        const last = side[side.length - 1];
        const lastGuide = last.kind === "cubic" ? last.c2 : last.kind === "quad" ? last.control : last.to;
        expect(Math.abs(crossIn(sub(inches(lastGuide), g.V), unitIn(band2Dir))), pos.label).toBeLessThan(1e-9);
        // The join of two domed pieces: the first piece's last guide point, its end, the straight step's
        // end and the second piece's first guide point all on one line along the dome band.
        if (side.length === 4 && side[1].kind === "cubic" && side[3].kind === "cubic") {
          joins++;
          const pts = [inches(side[1].c2), inches(side[1].to), inches(side[2].to), inches(side[3].c1)];
          for (const p of pts) expect(Math.abs(crossIn(sub(p, pts[1]), g.u)), pos.label).toBeLessThan(1e-9);
        }
      }
    }
    expect(joins).toBeGreaterThan(0);
  });

  it("the per-piece rule — the polygon through every control point less a third per parabola and cubicBlendArea per cubic — equals Green's theorem at every position", () => {
    for (const run of runs) {
      for (const pos of run) {
        expect(Math.abs(perPieceArea(pos.rail) - greenArea(pos.rail)), pos.label).toBeLessThan(1e-6);
        expect(Math.abs(perPieceArea(pos.today) - greenArea(pos.today)), pos.label).toBeLessThan(1e-6);
      }
    }
  });
});

describe("the knuckle is gone (plan 05, R23, M23-M25) — measured from the app's own curves against today's", () => {
  /** The tightest bend between the deck and Band 2's middle, new and today's, of one section (inches). */
  function bends(key: RailSectionKey, spec: RailSectionSpec, hardEdge: boolean) {
    const output = computeRailSectionOutput(key, spec, hardEdge);
    const x0 = output.bounds.xAxisMin;
    const rail = finishedRail(output, x0);
    const today = finishedRailFromCuts(appCuts(output), output.boardThickness, x0, output.result.hardEdge);
    const g = deckGeometry(rail, mmToInches(output.result.domedDeckBand));
    return {
      now: tightestRadius(rail.start, deckSide(rail, g.A)),
      today: tightestRadius(today.start, deckSide(today, g.A)),
    };
  }

  it("on the first board's three rails at Deck Profile 90% and at the 75% floor, the deck side bends more gently than today's", () => {
    for (const key of ["nose", "center", "tail"] as const) {
      for (const deckPercent of [90, DECK_PERCENT_MIN]) {
        const { now, today } = bends(
          key,
          { ...DEFAULT_RAIL_BAND_SPEC[key], deckPercent },
          key === "tail" && DEFAULT_RAIL_BAND_SPEC.tailHardEdge,
        );
        expect(now, `${key} @ ${deckPercent}%`).toBeGreaterThan(today);
      }
    }
  });

  it("the founder's worst case — a domed tail with the Domed Deck Band pulled in to 1/16\" past Deck Mark 3 — bends far more gently than today's near-corner", () => {
    for (const deckPercent of [90, DECK_PERCENT_MIN]) {
      const spec: RailSectionSpec = {
        ...DEFAULT_RAIL_BAND_SPEC.tail,
        deckPercent,
        nudges: { ...ZERO_RAIL_NUDGES, domedDeckBand: inchesToMm(-RAIL_NUDGE_LIMIT_IN.domedDeckBand) },
      };
      const output = computeRailSectionOutput("tail", spec, DEFAULT_RAIL_BAND_SPEC.tailHardEdge);
      // The engine holds the dome exactly 1/16" past Deck Mark 3 (rule 6) — the close-marks case.
      expect(
        Math.abs(mmToInches(output.result.domedDeckBand) - mmToInches(output.result.deckMark3) - RAIL_NUDGE_STEP_IN),
      ).toBeLessThan(1e-9);
      const { now, today } = bends("tail", spec, DEFAULT_RAIL_BAND_SPEC.tailHardEdge);
      expect(now, `${deckPercent}%`).toBeGreaterThan(today);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Sharp Bottom Edge (plan 05, R22, PC38 — the founder, 2026-11-02: "an advanced checkbox for leaving the
// bottom edge fairly sharp (follow the angle at bottom tuck 3)").
// ---------------------------------------------------------------------------------------------

describe("Sharp Bottom Edge — the corner at Bottom Tuck 3 stays as the cut leaves it (plan 05, R22, PC38)", () => {
  it("drops that corner's blend for a straight run down the last tuck band at its own angle, then along the bottom; the foam its third took off stays on", () => {
    for (const entry of everyEntry) {
      for (const singleTuck of [false, true]) {
        const plainOut = appSection(entry, { singleTuck });
        const sharpOut = appSection(entry, { singleTuck, sharpBottomEdge: true });
        const plain = sectionFinishedRail(plainOut.result, plainOut.domed);
        const sharp = sectionFinishedRail(sharpOut.result, sharpOut.domed);
        const label = variantLabel(entry, { singleTuck, sharpBottomEdge: true });
        const n = plain.steps.length;
        // Plain ends: … the last tuck band's blend to its middle M, a line to the Bottom Tuck 3 blend, the
        // blend whose control is the Bottom Tuck 3 corner, and the line along the bottom.
        const bt3Blend = plain.steps[n - 2];
        expect(bt3Blend.kind, label).toBe("quad");
        if (bt3Blend.kind !== "quad") continue;
        const corner = bt3Blend.control;
        expect(Math.abs(mmToInches(corner.y)), label).toBeLessThan(1e-9);
        expect(mmToInches(corner.x), label).toBeLessThan(0);
        // Everything up to the last tuck band's middle is the plain curve's.
        expect(sharp.steps.slice(0, -2), label).toEqual(plain.steps.slice(0, -3));
        // Then one straight step to the corner itself …
        expect(sharp.steps[sharp.steps.length - 2], label).toEqual({ kind: "line", to: corner });
        // … running down the last tuck band: the band's middle, the corner and the corner before it in line.
        const M = inches(sharp.steps[sharp.steps.length - 3].to);
        const chain = plain.chain.map(inches);
        const before = chain[chain.length - 3];
        expect(Math.abs(crossIn(sub(inches(corner), M), unitIn(sub(inches(corner), before)))), label).toBeLessThan(1e-9);
        // … and one along the bottom to the drawing's edge.
        expect(sharp.steps[sharp.steps.length - 1], label).toEqual(plain.steps[n - 1]);
        // The corner is sampled once: the blend's 17 samples become one.
        expect(sharp.samples.length, label).toBe(plain.samples.length - 16);
        // The foam the blend took off — a third of its triangle — stays on.
        const A = plain.steps[n - 3].to;
        const B = bt3Blend.to;
        const triangle = Math.abs(cross(sub2(corner, A), sub2(B, A))) / 2;
        expect(Math.abs(railBlendArea(sharp) - (railBlendArea(plain) - triangle / 3)), label).toBeLessThan(1e-6);
      }
      // On a hard edge the last corner is the rail's own foot, sharp already: the box changes nothing.
      const hard = appSection(entry, { hardEdge: true });
      const hardSharp = appSection(entry, { hardEdge: true, sharpBottomEdge: true });
      expect(sectionFinishedRail(hardSharp.result, hardSharp.domed)).toEqual(sectionFinishedRail(hard.result, hard.domed));
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Volume counts the finished rail (quick 261102-gec plan 03, the founder's D-V1 "Switch to the finished
// curve", 2026-11-02). Every expected figure below is a relation — the cut foam's own shoelace, Green's
// theorem over the finished rail's own steps, or the limit ever-finer sampling of those steps converges to
// — never a typed area (Rule 1).
// ---------------------------------------------------------------------------------------------

type Variant = { hardEdge?: boolean; singleTuck?: boolean; sharpBottomEdge?: boolean };

/** The app's own section for a golden entry, built as `finishedRail`'s end-to-end test builds it, with a
 * hard edge (on a tail), Single Tuck or Sharp Bottom Edge on request. */
function appSection(entry: GoldenEntry, opts: Variant = {}) {
  return computeRailSectionOutput(
    opts.hardEdge ? "tail" : entry.input.scale === 1 ? "center" : "nose",
    specFor(entry.input, { singleTuck: opts.singleTuck ?? false, sharpBottomEdge: opts.sharpBottomEdge ?? false }),
    opts.hardEdge ?? false,
  );
}

const VARIANTS: readonly Variant[] = [
  {},
  { hardEdge: true },
  { singleTuck: true },
  { sharpBottomEdge: true },
  { singleTuck: true, sharpBottomEdge: true },
];

/** The cut lines a section's foam is clipped by — the four bands, and the dome on a domed deck. */
function appCuts(output: ReturnType<typeof computeRailSectionOutput>): RailCutLine[] {
  return output.segments
    .filter((s) => ["band1", "band2", "tuck1", "tuck2"].includes(s.key) || (s.key === "domedBand" && output.domed))
    .map((s) => ({ p1: s.p1, p2: s.p2 }));
}

/** A closed polygon's area by the shoelace. */
function shoelace(pts: readonly XY[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

const cross = (a: XY, b: XY) => a.x * b.y - b.x * a.y;
const sub2 = (a: XY, b: XY): XY => ({ x: a.x - b.x, y: a.y - b.y });

/** The finished rail's exact area by Green's theorem: each line x1·y2 − x2·y1 over 2, each parabola from
 * P0 with control P1 to P2 (2·P0×P1 + 2·P1×P2 + P0×P2) / 6, each cubic `cubicArea`, closed along the
 * drawing's left edge. */
function greenArea(rail: FinishedRail): number {
  let a = 0;
  let at: XY = rail.start;
  for (const step of rail.steps) {
    if (step.kind === "line") a += cross(at, step.to) / 2;
    else if (step.kind === "quad")
      a += (2 * cross(at, step.control) + 2 * cross(step.control, step.to) + cross(at, step.to)) / 6;
    else a += cubicArea(at, step.c1, step.c2, step.to);
    at = step.to;
  }
  a += cross(at, rail.start) / 2;
  return Math.abs(a);
}

/** The per-piece rule (plan 05, PC35): the polygon through the start and every step's control points and
 * ends, less a third of each parabola's triangle and `cubicBlendArea` for each cubic. */
function perPieceArea(rail: FinishedRail): number {
  const poly: XY[] = [rail.start];
  let pieces = 0;
  let at: XY = rail.start;
  for (const step of rail.steps) {
    if (step.kind === "quad") {
      poly.push(step.control);
      pieces += Math.abs(cross(sub2(step.control, at), sub2(step.to, at))) / 2 / 3;
    } else if (step.kind === "cubic") {
      poly.push(step.c1, step.c2);
      pieces += cubicBlendArea(at, step.c1, step.c2, step.to);
    }
    poly.push(step.to);
    at = step.to;
  }
  return shoelace(poly) - pieces;
}

/** The finished rail as a polygon, every parabola and cubic cut into `n` straight pieces. */
function resampled(rail: FinishedRail, n: number): Point2D[] {
  const pts: Point2D[] = [rail.start];
  let at: XY = rail.start;
  for (const step of rail.steps) {
    if (step.kind === "line") pts.push(step.to);
    else {
      for (let k = 1; k <= n; k++) {
        const [x, y] =
          step.kind === "quad" ? quadAt(at, step.control, step.to, k / n) : cubicAt(at, step.c1, step.c2, step.to, k / n);
        pts.push({ x, y } as Point2D);
      }
    }
    at = step.to;
  }
  return pts;
}

const variantLabel = (entry: GoldenEntry, variant: object) => JSON.stringify({ ...entry.input, ...variant });

describe("railBlendArea — the foam the blends take off, exactly (quick 261102-gec plan 03, PV1; plan 05, M27)", () => {
  it("cut foam minus the blend area is the finished rail's exact area by Green's theorem, on every golden case and variant", () => {
    let checked = 0;
    for (const entry of everyEntry) {
      for (const variant of VARIANTS) {
        const output = appSection(entry, variant);
        const cutArea = shoelace(railCutFoam(appCuts(output), output.boardThickness, output.bounds.xAxisMin));
        const rail = sectionFinishedRail(output.result, output.domed);
        const blend = railBlendArea(rail);
        const label = variantLabel(entry, variant);
        expect(blend, label).toBeGreaterThanOrEqual(0);
        expect(blend, label).toBeLessThan(cutArea);
        expect(Math.abs(cutArea - blend - greenArea(rail)), label).toBeLessThan(1e-6);
        checked++;
      }
    }
    expect(checked).toBe(everyEntry.length * VARIANTS.length);
  });

  it("the per-piece rule — a third per parabola, cubicBlendArea per cubic, over the polygon through every control point — equals Green's theorem on every golden case and variant", () => {
    for (const entry of everyEntry) {
      for (const variant of VARIANTS) {
        const output = appSection(entry, variant);
        const rail = sectionFinishedRail(output.result, output.domed);
        expect(Math.abs(perPieceArea(rail) - greenArea(rail)), variantLabel(entry, variant)).toBeLessThan(1e-6);
      }
    }
  });

  it("on an all-parabola curve (the reference page's own) it is plan 03's sum of a third of each corner's triangle", () => {
    for (const entry of everyEntry) {
      const rail = finishedFor(entry);
      let thirds = 0;
      let at: XY = rail.start;
      for (const step of rail.steps) {
        expect(step.kind).not.toBe("cubic");
        if (step.kind === "quad") thirds += Math.abs(cross(sub2(step.control, at), sub2(step.to, at))) / 2 / 3;
        at = step.to;
      }
      expect(Math.abs(railBlendArea(rail) - thirds), JSON.stringify(entry.input)).toBeLessThan(1e-6);
    }
  });

  it("ever-finer sampling of the curves converges on that exact area as 1/n² (at least tenfold from 64 to 256 pieces)", () => {
    for (const entry of everyEntry) {
      for (const variant of VARIANTS) {
        const output = appSection(entry, variant);
        const rail = sectionFinishedRail(output.result, output.domed);
        const exact = greenArea(rail);
        const err = (n: number) => Math.abs(shoelace(resampled(rail, n)) - exact);
        const [e16, e64, e256] = [err(16), err(64), err(256)];
        const label = variantLabel(entry, variant);
        expect(e64, label).toBeLessThanOrEqual(e16 + 1e-9);
        // Below a billionth of a square millimetre the difference is the arithmetic's own rounding, not
        // the sampling, so the tenfold fall is only asked of a real error.
        if (e64 > 1e-9) expect(e256 * 10, label).toBeLessThan(e64);
      }
    }
  }, 60_000);

  it("a hard edge's sharp bottom corner takes nothing off: no blend has the corner as its control (PV6)", () => {
    for (const entry of everyEntry) {
      const output = appSection(entry, { hardEdge: true });
      const rail = sectionFinishedRail(output.result, output.domed);
      for (const step of rail.steps) {
        if (step.kind !== "quad") continue;
        expect(Math.abs(step.control.x) < 1e-9 && Math.abs(step.control.y) < 1e-9, variantLabel(entry, { hardEdge: true })).toBe(
          false,
        );
      }
    }
  });
});

describe("sectionFinishedRail — the very curve RAILS draws (quick 261102-gec plan 03, PV4)", () => {
  it("has the same start and steps as finishedRail at the section's own plot edge, on every golden case and variant", () => {
    for (const entry of everyEntry) {
      for (const variant of VARIANTS) {
        const output = appSection(entry, variant);
        const fromSection = sectionFinishedRail(output.result, output.domed);
        const drawn = finishedRail(output, output.bounds.xAxisMin);
        expect(fromSection.start, variantLabel(entry, variant)).toEqual(drawn.start);
        expect(fromSection.steps, variantLabel(entry, variant)).toEqual(drawn.steps);
      }
    }
  });
});
