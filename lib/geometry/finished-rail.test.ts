/**
 * The finished rail, blended halfway (quick 261102-gec, R13; the founder's pick of "Blended halfway"
 * over "One even round", 2026-11-02, sketch 018).
 *
 * Every expected number here is the reference page's own (lib/geometry/__fixtures__/rails-v2-golden.json,
 * written by scripts/extract-rails-v2-golden.ts executing reference/sketches/018-chris-rails-v2.js) or a
 * relation between them — never a typed coordinate (Rule 1, the plan's M12).
 */
import { describe, expect, it } from "vitest";
import type { Point2D } from "./board";
import {
  finishedRail,
  finishedRailFromCuts,
  finishedRailPath,
  railBlendArea,
  railCutFoam,
  sectionFinishedRail,
  type FinishedRail,
  type RailCutLine,
} from "./finished-rail";
import { ZERO_RAIL_NUDGES, computeRailSectionOutput, type RailFamily } from "./rail-bands";
import golden from "./__fixtures__/rails-v2-golden.json";
import { inchesToMm, mmToInches } from "./units";

type Pt = number[];
interface GoldenSegment {
  key: string;
  p1: Pt;
  p2: Pt;
}
interface GoldenEntry {
  input: { T: number; deck: number; F: number; top: number; sym: boolean; scale: number };
  sheet: { domed: boolean; bt: number; apexCenter: number; rm1: number };
  segments: GoldenSegment[];
}

const workbook = golden.workbook as unknown as GoldenEntry[];
const cases = golden.cases as unknown as GoldenEntry[];
const everyEntry: GoldenEntry[] = [...workbook, ...cases];

/** The section's own plot edge (rule 12): 2" beyond the Domed Deck Band, 2.4 x the board thickness. */
const x0InchesFor = (entry: GoldenEntry) => -(2.4 * entry.input.T + 2);

const toMm = (p: Pt): Point2D => ({ x: inchesToMm(p[0]), y: inchesToMm(p[1]) });
const inches = (p: Point2D): [number, number] => [mmToInches(p.x), mmToInches(p.y)];

/** The page's own cut lines for one case: the dome only when the deck is domed, the four bands, any
 * line shorter than a millionth of an inch dropped — exactly what its `cuts(r)` keeps. */
function cutsFor(entry: GoldenEntry, keys: readonly string[] = ["domed", "band1", "band2", "tuck1", "tuck2"]): RailCutLine[] {
  return entry.segments
    .filter((s) => keys.includes(s.key) && (s.key !== "domed" || entry.sheet.domed))
    .filter((s) => Math.hypot(s.p1[0] - s.p2[0], s.p1[1] - s.p2[1]) > 1e-6)
    .map((s) => ({ p1: toMm(s.p1), p2: toMm(s.p2) }));
}

function finishedFor(entry: GoldenEntry, hardEdge = false, keys?: readonly string[]): FinishedRail {
  return finishedRailFromCuts(cutsFor(entry, keys), inchesToMm(entry.sheet.bt), inchesToMm(x0InchesFor(entry)), hardEdge);
}

/** True when `p` lies inside or on the convex foam polygon (a signed side test on every edge, each
 * normalised to a distance so the tolerance is in inches). */
function insideFoam(poly: [number, number][], p: [number, number], tolIn: number): boolean {
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

const quadAt = (A: Point2D, V: Point2D, B: Point2D, t: number): [number, number] => [
  (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * V.x + t * t * B.x,
  (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * V.y + t * t * B.y,
];

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

describe("finishedRail — end to end, from the app's own rail section (quick 261102-gec)", () => {
  it("draws every recorded finished rail from the app's own marks, matching the page's samples within a millionth of an inch", () => {
    for (const curve of golden.finished) {
      const { T, deck, F, top, sym, scale } = curve.input;
      const output = computeRailSectionOutput(
        scale === 1 ? "center" : "nose",
        {
          boardThickness: inchesToMm(T),
          deckPercent: deck,
          family: F as RailFamily,
          ratioTopPercent: top,
          symmetrical: sym,
          cornerCutOffsetOverride: null,
          removeCornerCut: false,
          singleTuck: false,
          bottomTuck3Override: null,
          scaleFromCenter: scale,
          nudges: ZERO_RAIL_NUDGES,
        },
        false,
      );
      // The drawing's own left edge (rule 12) is the page's x0.
      expect(Math.abs(mmToInches(output.bounds.xAxisMin) - curve.x0)).toBeLessThan(1e-9);
      const rail = finishedRail(output, inchesToMm(curve.x0));
      expect(rail.samples.length, curve.label).toBe(curve.points.length);
      rail.samples.forEach((p, i) => {
        const [x, y] = inches(p);
        expect(Math.abs(x - curve.points[i][0]), `${curve.label} sample ${i} x`).toBeLessThan(1e-6);
        expect(Math.abs(y - curve.points[i][1]), `${curve.label} sample ${i} y`).toBeLessThan(1e-6);
      });
    }
  });
});

describe("finishedRailFromCuts — never outside a cut (R13 a)", () => {
  it("keeps every sample inside or on the foam the cuts leave, on the workbook's sets and every grid case", () => {
    // About 170,000 samples: every one outside is collected and asserted once.
    const outside: string[] = [];
    for (const entry of everyEntry) {
      const cuts = cutsFor(entry);
      const bt = inchesToMm(entry.sheet.bt);
      const x0 = inchesToMm(x0InchesFor(entry));
      const foam = railCutFoam(cuts, bt, x0).map(inches);
      const rail = finishedRailFromCuts(cuts, bt, x0, false);
      rail.samples.forEach((p, i) => {
        if (!insideFoam(foam, inches(p), 1e-9)) outside.push(`${JSON.stringify(entry.input)} sample ${i}`);
      });
    }
    expect(outside).toEqual([]);
  }, 30_000);
});

describe("finishedRailFromCuts — meets the rail only at the Apex Center (R13 b)", () => {
  it("on every tucked case, the only samples on the rail line sit at that case's Apex Center", () => {
    for (const entry of everyEntry) {
      const rail = finishedFor(entry);
      const onRail = rail.samples.map(inches).filter(([x]) => x >= -1e-9);
      expect(onRail.length).toBeGreaterThan(0);
      for (const [, y] of onRail) expect(Math.abs(y - entry.sheet.apexCenter)).toBeLessThan(1e-9);
    }
  });
});

describe("finishedRailFromCuts — a hard edge keeps its corner sharp (R13 c; the Apex Center rule does not apply to a hard edge)", () => {
  it("leaves the wall at half of Rail Mark 1, runs straight down the wall to the bottom corner, then straight along the bottom", () => {
    for (const entry of everyEntry) {
      const x0 = inchesToMm(x0InchesFor(entry));
      const rail = finishedFor(entry, true, ["domed", "band1", "band2"]);
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
    }
  });
});

describe("finishedRailFromCuts — the steps draw the samples", () => {
  it("re-sampling every quad step at 17 even parameters reproduces the samples, and every lone line ends on a chain corner", () => {
    for (const entry of [...workbook, ...cases.filter((_, i) => i % 7 === 0)]) {
      for (const hardEdge of [false, true]) {
        const rail = hardEdge ? finishedFor(entry, true, ["domed", "band1", "band2"]) : finishedFor(entry);
        const rebuilt: [number, number][] = [[rail.start.x, rail.start.y]];
        let at = rail.start;
        rail.steps.forEach((step, i) => {
          if (step.kind === "quad") {
            for (let s = 0; s <= 16; s++) rebuilt.push(quadAt(at, step.control, step.to, s / 16));
          } else if (rail.steps[i + 1]?.kind !== "quad") {
            rebuilt.push([step.to.x, step.to.y]);
            expect(rail.chain.some((c) => c.x === step.to.x && c.y === step.to.y)).toBe(true);
          }
          at = step.to;
        });
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

describe("finishedRailPath — the drawn path (quick 261102-gec plan 02, PC22)", () => {
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
    return [...d.matchAll(/([MLQZ])([^MLQZ]*)/g)].map((m) => ({
      op: m[1],
      nums: m[2].trim() === "" ? [] : m[2].trim().split(/\s+/).map(Number),
    }));
  }

  it("starts with M at the projected start, then one L per line step and one Q per blend, in order, every point projected", () => {
    for (const entry of [...workbook, ...cases.filter((_, i) => i % 50 === 0)]) {
      for (const hardEdge of [false, true]) {
        const rail = hardEdge ? finishedFor(entry, true, ["domed", "band1", "band2"]) : finishedFor(entry);
        const project = projectionFor(rail);
        const cmds = commands(finishedRailPath(rail, project));
        expect(cmds[0].op).toBe("M");
        const start = project(rail.start);
        expect(cmds[0].nums).toEqual([start.x, start.y]);
        expect(cmds.length).toBe(rail.steps.length + 1);
        rail.steps.forEach((step, i) => {
          const cmd = cmds[i + 1];
          if (step.kind === "line") {
            const to = project(step.to);
            expect(cmd.op).toBe("L");
            expect(cmd.nums).toEqual([to.x, to.y]);
          } else {
            const c = project(step.control);
            const to = project(step.to);
            expect(cmd.op).toBe("Q");
            expect(cmd.nums).toEqual([c.x, c.y, to.x, to.y]);
          }
        });
        expect(cmds.filter((c) => c.op === "Q").length).toBe(rail.steps.filter((s) => s.kind === "quad").length);
        expect(cmds.filter((c) => c.op === "L").length).toBe(rail.steps.filter((s) => s.kind === "line").length);
      }
    }
  });

  it("closed: the same path plus Z, which closes along the drawing's left edge from the bottom's end to the deck's", () => {
    for (const entry of workbook) {
      const rail = finishedFor(entry);
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
// Volume counts the finished rail (quick 261102-gec plan 03, the founder's D-V1 "Switch to the finished
// curve", 2026-11-02). Every expected figure below is a relation — the cut foam's own shoelace, Green's
// theorem over the finished rail's own steps, or the limit ever-finer sampling of those steps converges to
// — never a typed area (Rule 1).
// ---------------------------------------------------------------------------------------------

/** The app's own section for a golden entry, built as `finishedRail`'s end-to-end test builds it, with a
 * hard edge (on a tail) or Single Tuck on request. */
function appSection(entry: GoldenEntry, opts: { hardEdge?: boolean; singleTuck?: boolean } = {}) {
  const { T, deck, F, top, sym, scale } = entry.input;
  return computeRailSectionOutput(
    opts.hardEdge ? "tail" : scale === 1 ? "center" : "nose",
    {
      boardThickness: inchesToMm(T),
      deckPercent: deck,
      family: F as RailFamily,
      ratioTopPercent: top,
      symmetrical: sym,
      cornerCutOffsetOverride: null,
      removeCornerCut: false,
      singleTuck: opts.singleTuck ?? false,
      bottomTuck3Override: null,
      scaleFromCenter: scale,
      nudges: ZERO_RAIL_NUDGES,
    },
    opts.hardEdge ?? false,
  );
}

const VARIANTS: readonly { hardEdge?: boolean; singleTuck?: boolean }[] = [{}, { hardEdge: true }, { singleTuck: true }];

/** The cut lines a section's foam is clipped by — the four bands, and the dome on a domed deck. */
function appCuts(output: ReturnType<typeof computeRailSectionOutput>): RailCutLine[] {
  return output.segments
    .filter((s) => ["band1", "band2", "tuck1", "tuck2"].includes(s.key) || (s.key === "domedBand" && output.domed))
    .map((s) => ({ p1: s.p1, p2: s.p2 }));
}

/** A closed polygon's area by the shoelace. */
function shoelace(pts: readonly Point2D[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

const cross = (a: Point2D, b: Point2D) => a.x * b.y - b.x * a.y;

/** The finished rail's exact area by Green's theorem: each line x1·y2 − x2·y1 over 2, each parabola from
 * P0 with control P1 to P2 (2·P0×P1 + 2·P1×P2 + P0×P2) / 6, closed along the drawing's left edge. */
function greenArea(rail: FinishedRail): number {
  let a = 0;
  let at = rail.start;
  for (const step of rail.steps) {
    if (step.kind === "line") a += cross(at, step.to) / 2;
    else a += (2 * cross(at, step.control) + 2 * cross(step.control, step.to) + cross(at, step.to)) / 6;
    at = step.to;
  }
  a += cross(at, rail.start) / 2;
  return Math.abs(a);
}

/** The finished rail as a polygon, every parabola cut into `n` straight pieces. */
function resampled(rail: FinishedRail, n: number): Point2D[] {
  const pts: Point2D[] = [rail.start];
  let at = rail.start;
  for (const step of rail.steps) {
    if (step.kind === "line") pts.push(step.to);
    else {
      for (let k = 1; k <= n; k++) {
        const [x, y] = quadAt(at, step.control, step.to, k / n);
        pts.push({ x, y } as Point2D);
      }
    }
    at = step.to;
  }
  return pts;
}

const variantLabel = (entry: GoldenEntry, variant: object) => JSON.stringify({ ...entry.input, ...variant });

describe("railBlendArea — the foam the blends take off, exactly (quick 261102-gec plan 03, PV1)", () => {
  it("cut foam minus the blend area is the finished rail's exact area by Green's theorem, on every golden case, hard edge and Single Tuck", () => {
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

  it("ever-finer sampling of the parabolas converges on that exact area as 1/n² (at least tenfold from 64 to 256 pieces)", () => {
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
  });

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
  it("has the same start and steps as finishedRail at the section's own plot edge, on every golden case, hard edge and Single Tuck", () => {
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
