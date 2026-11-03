/**
 * The finished rail — the shape a rail's cuts leave, with every corner blended halfway into the bands
 * either side of it (quick 261102-gec, R13).
 *
 * A shaper cuts a rail as flat bands (Rail Band 1 and 2 on the deck, Rail Tuck 1 and 2 underneath, and
 * the dome on a domed deck), then rolls the corners between them away with a sanding block. This module
 * draws that rolled shape: each corner of the cut outline becomes a parabola that leaves each band at
 * exactly its middle. The founder picked this "Blended halfway" style over "One even round" on
 * 2026-11-02 (sketch 018, `.planning/sketches/018-finished-rail-curve/`). Blended halfway always meets
 * the rail line at the Apex Center on a tucked rail, because the corners at Rail Mark 1 and Rail Tuck 1
 * each reach halfway along the wall between them.
 *
 * It is what VOLUME counts (quick 261102-gec plan 03, the founder's D-V1, 2026-11-02: "Switch to the
 * finished curve"), as well as what RAILS draws. Volume takes it exactly, not by sampling: `railBlendArea`
 * is the foam the blends take off one rail, and a station's finished area is its cut area (the faceted
 * profile `rail-bands.ts` builds, proven to enclose exactly the foam the cuts leave) less both rails'
 * blend areas. `sectionFinishedRail` is the one way volume reaches a section's finished rail, so the
 * quoted litres and VOLUME's working rows can never sit on different curves (PV2).
 *
 * INCH-DOMAIN CORE, Mm at the boundary, like `rail-bands.ts`: the private functions below are ported
 * statement for statement from the reference page's finish block (`reference/sketches/018-chris-rails-v2.js`,
 * `near`, `dist`, `lerp`, `quad`, `clip`, `foam`, `cutChain`, `blendRun` at f = 0.5 and `finishedCurve`),
 * with every tolerance kept, so the curve matches the page's own samples (proven against its golden).
 * Two additions, both from sketch 018's own `blendRun` (index.html ~719-733), which the page's copy leaves
 * out:
 * - HARD EDGE. A tail with a hard edge keeps its bottom corner at (0, 0) sharp: no blend leaves it, so the
 *   finished rail runs straight down the rail wall to the corner and straight along the bottom. It is
 *   emitted as one straight `line` step to the corner with ONE sample of it (sketch 018 pushes 17 copies
 *   of the same point; the drawn shape is identical — PLANNER'S CHOICE PC13). The Apex Center rule does
 *   not apply to a hard edge: there is no Rail Tuck 1 below the apex to blend toward.
 * - STEPS. Alongside the page's samples the curve comes as drawing steps — a `line` to each blend's
 *   start, a `quad` with the corner as its control to the blend's end, and a final `line` to the far
 *   end — so a drawing can render the exact parabolas rather than the samples.
 *
 * Coordinates are a section's own: x 0 at the rail, negative toward the stringer; y up from the bottom.
 * Pure: no React, browser or database import (Rule 1).
 */
import type { Point2D } from "./board";
// A run-time import since plan 03 (`sectionFinishedRail`); `rail-bands.ts` imports nothing from this file,
// so there is no cycle — keep it that way (V8).
import {
  type RailSectionOutput,
  type RailSectionResult,
  type RailSegment,
  type RailSegmentKey,
  buildRailSegments,
  railPlotBounds,
} from "./rail-bands";
import { type Mm, inchesToMm, mm, mmToInches } from "./units";

/** One drawing step of the finished rail, in millimetres; each starts where the previous one ended. */
export type FinishedRailStep = { kind: "line"; to: Point2D } | { kind: "quad"; control: Point2D; to: Point2D };

/** The finished rail of one cross-section, in millimetres. `start` is the deck end at the drawing's left
 * edge; `steps` draw the curve from there over the rail to the bottom's left edge; `samples` are the
 * reference page's own sampled points of the same curve; `chain` is the cut outline it blends. */
export interface FinishedRail {
  start: Point2D;
  steps: FinishedRailStep[];
  samples: Point2D[];
  chain: Point2D[];
}

/** One straight cut across the rail, in millimetres. */
export interface RailCutLine {
  p1: Point2D;
  p2: Point2D;
}

// ---------------------------------------------------------------------------------------------
// Private inch-domain core — statement-for-statement ports of the reference page's finish block.
// ---------------------------------------------------------------------------------------------

type P = [number, number];
interface CutIn {
  p1: P;
  p2: P;
}
type StepIn = { kind: "line"; to: P } | { kind: "quad"; control: P; to: P };

const near = (a: P, b: P) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const quad = (A: P, V: P, B: P, t: number): P => [
  (1 - t) * (1 - t) * A[0] + 2 * (1 - t) * t * V[0] + t * t * B[0],
  (1 - t) * (1 - t) * A[1] + 2 * (1 - t) * t * V[1] + t * t * B[1],
];

/** The page's `cuts(r)` filter: a line shorter than a millionth of an inch takes no foam off. */
const realCuts = (cuts: CutIn[]) => cuts.filter((s) => dist(s.p1, s.p2) > 1e-6);

/** Keep the side of the line a→b that `ref` is on (the page's `clip`, its 1e-9 keep tolerance). */
function clip(poly: P[], a: P, b: P, ref: P): P[] {
  const side = (p: P) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const keep = Math.sign(side(ref)) || 1;
  const inside = (p: P) => side(p) * keep >= -1e-9;
  const cross = (p: P, q: P): P => {
    const sp = side(p);
    const sq = side(q);
    const k = sp / (sp - sq);
    return [p[0] + k * (q[0] - p[0]), p[1] + k * (q[1] - p[1])];
  };
  const out: P[] = [];
  poly.forEach((cur, i) => {
    const prv = poly[(i + poly.length - 1) % poly.length];
    const ci = inside(cur);
    const pi = inside(prv);
    if (ci) {
      if (!pi) out.push(cross(prv, cur));
      out.push(cur);
    } else if (pi) out.push(cross(prv, cur));
  });
  return out;
}

/** The foam left once every line is cut (the page's `foam`): the board's box from the drawing's left
 * edge to the rail, clipped by each cut, keeping the side a point just inside the left edge is on. */
function foamInches(cuts: CutIn[], bt: number, X0: number): P[] {
  let poly: P[] = [
    [X0, 0],
    [0, 0],
    [0, bt],
    [X0, bt],
  ];
  const ref: P = [X0 + 0.05, bt / 2];
  for (const s of realCuts(cuts)) poly = clip(poly, s.p1, s.p2, ref);
  return poly;
}

/** The cut shape as one run (the page's `cutChain`): along the deck from the drawing's far end, over the
 * rail, back along the bottom — repeated points and straight-through corners dropped. */
function cutChainInches(cuts: CutIn[], bt: number, X0: number): P[] {
  let poly = foamInches(cuts, bt, X0);
  poly = poly.filter((p, i) => !near(p, poly[(i + 1) % poly.length]));
  const iTop = poly.findIndex((p) => Math.abs(p[0] - X0) < 1e-6 && Math.abs(p[1] - bt) < 1e-6);
  const rot = poly.slice(iTop).concat(poly.slice(0, iTop));
  const chain = [rot[0]].concat(rot.slice(1).reverse());
  return chain.filter((p, i) => {
    if (i === 0 || i === chain.length - 1) return true;
    const a = chain[i - 1];
    const b = chain[i + 1];
    return Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) > 1e-7;
  });
}

/** The halfway blend (the page's `blendRun` + `finishedCurve` at f = 0.5, with sketch 018's hard edge):
 * each corner rounded by a parabola that leaves each band at its middle; the deck and bottom flats take
 * the neighbouring band's reach. */
function finishedCurveInches(cuts: CutIn[], bt: number, X0: number, hardEdge: boolean) {
  const chain = cutChainInches(cuts, bt, X0);
  const n = chain.length - 1;
  const fullLen = chain.slice(0, -1).map((p, i) => dist(p, chain[i + 1]));
  const flat = fullLen.map((_, i) => i === 0 || i === n - 1);
  const f = 0.5;
  const pts: P[] = [chain[0]];
  const steps: StepIn[] = [];
  for (let i = 1; i < n; i++) {
    const V = chain[i];
    const lIn = dist(chain[i - 1], V);
    const lOut = dist(V, chain[i + 1]);
    // Sketch 018: a hard edge's bottom corner stays sharp (PC13: one straight step, one sample).
    const sharp = hardEdge && Math.abs(V[0]) < 1e-6 && Math.abs(V[1]) < 1e-6;
    if (sharp || lIn < 1e-9 || lOut < 1e-9) {
      steps.push({ kind: "line", to: V });
      pts.push(V);
      continue;
    }
    const dIn = Math.min(flat[i - 1] ? f * fullLen[i] : f * fullLen[i - 1], lIn);
    const dOut = Math.min(flat[i] ? f * fullLen[i - 1] : f * fullLen[i], lOut);
    const A = lerp(V, chain[i - 1], dIn / lIn);
    const B = lerp(V, chain[i + 1], dOut / lOut);
    steps.push({ kind: "line", to: A }, { kind: "quad", control: V, to: B });
    for (let s = 0; s <= 16; s++) pts.push(quad(A, V, B, s / 16));
  }
  steps.push({ kind: "line", to: chain[n] });
  pts.push(chain[n]);
  return { chain, pts, steps };
}

// ---------------------------------------------------------------------------------------------
// Public Mm boundary
// ---------------------------------------------------------------------------------------------

const toIn = (p: Point2D): P => [mmToInches(p.x), mmToInches(p.y)];
const toMm = (p: P): Point2D => ({ x: mm(inchesToMm(p[0])), y: mm(inchesToMm(p[1])) });
const cutsToInches = (cuts: readonly RailCutLine[]): CutIn[] => cuts.map((c) => ({ p1: toIn(c.p1), p2: toIn(c.p2) }));

/** The foam the cuts leave between the drawing's left edge `x0` and the rail, as a closed polygon. */
export function railCutFoam(cuts: readonly RailCutLine[], boardThickness: Mm, x0: Mm): Point2D[] {
  return foamInches(cutsToInches(cuts), mmToInches(boardThickness), mmToInches(x0)).map(toMm);
}

/** The finished rail, blended halfway, from a section's cut lines, its board thickness, the drawing's
 * left edge and whether its bottom corner is a hard edge. */
export function finishedRailFromCuts(
  cuts: readonly RailCutLine[],
  boardThickness: Mm,
  x0: Mm,
  hardEdge: boolean,
): FinishedRail {
  const r = finishedCurveInches(cutsToInches(cuts), mmToInches(boardThickness), mmToInches(x0), hardEdge);
  return {
    start: toMm(r.chain[0]),
    steps: r.steps.map((s) =>
      s.kind === "line" ? { kind: "line", to: toMm(s.to) } : { kind: "quad", control: toMm(s.control), to: toMm(s.to) },
    ),
    samples: r.pts.map(toMm),
    chain: r.chain.map(toMm),
  };
}

/** The finished rail as an SVG path (quick 261102-gec plan 02, PC22, 2026-11-02): `M` at the deck end, then
 * one `L` per straight step and one `Q` per blend, each point passed through `project` — the drawing's own
 * mapping from a section's millimetres to its coordinates, so the curve lands exactly on the drawn bands.
 * `closed` adds the close along the drawing's left edge (from the bottom's end back up to the deck's), so
 * the shape can be filled with the board's colour. The path is exact: the parabolas themselves, not samples. */
export function finishedRailPath(
  rail: FinishedRail,
  project: (p: Point2D) => { x: number; y: number },
  options: { closed?: boolean } = {},
): string {
  const pt = (p: Point2D) => {
    const q = project(p);
    return `${q.x} ${q.y}`;
  };
  const parts = [`M ${pt(rail.start)}`];
  for (const step of rail.steps) {
    parts.push(step.kind === "line" ? `L ${pt(step.to)}` : `Q ${pt(step.control)} ${pt(step.to)}`);
  }
  if (options.closed) parts.push("Z");
  return parts.join(" ");
}

/** The bands that take foam off; the dome joins them only when the deck is domed. */
const CUT_KEYS: ReadonlySet<RailSegmentKey> = new Set<RailSegmentKey>(["band1", "band2", "tuck1", "tuck2"]);

/** The cut lines of a section's drawn segments: the four bands, and the dome on a domed deck. */
function cutsOf(segments: readonly RailSegment[], domed: boolean): RailCutLine[] {
  return segments
    .filter((s) => CUT_KEYS.has(s.key) || (s.key === "domedBand" && domed))
    .map((s) => ({ p1: s.p1, p2: s.p2 }));
}

/** The finished rail of one computed rail section, drawn from the drawing's left edge `x0`. */
export function finishedRail(output: RailSectionOutput, x0: Mm): FinishedRail {
  return finishedRailFromCuts(cutsOf(output.segments, output.domed), output.boardThickness, x0, output.result.hardEdge);
}

/**
 * The finished rail of a bare section result — what volume counts at each of its 51 stations, which have
 * no drawing output of their own (quick 261102-gec plan 03, D-V1). The cuts are chosen exactly as
 * `finishedRail` chooses them, from `buildRailSegments(result)`; the left edge is the section's own plot
 * edge, 2" beyond its Domed Deck Band (`railPlotBounds`, rule 12), so this is the very curve RAILS draws
 * for that section (PV4 — measured: twice as far changes no blend area by more than 1.1e-13 mm² on the
 * presets, because every blend is set by the bands, not by how far the flats run); the hard edge comes
 * from the result.
 */
export function sectionFinishedRail(result: RailSectionResult, domed: boolean): FinishedRail {
  return finishedRailFromCuts(
    cutsOf(buildRailSegments(result), domed),
    result.boardThickness,
    railPlotBounds(result).xAxisMin,
    result.hardEdge,
  );
}

/**
 * The foam the blends take off ONE rail, in square millimetres, exactly (quick 261102-gec plan 03, D-V1,
 * PV1). Each blend swaps the two straight runs A→V→B of a cut corner for the parabola from A to B whose
 * control point is the corner V. Those two runs are the parabola's own tangent lines at its ends, and the
 * area between a parabola and its two end tangents is exactly one third of the triangle they make
 * (Archimedes' quadrature of the parabola). So the foam a blend takes off is a third of triangle A-V-B,
 * and one rail's blend area is the sum of those thirds over the finished rail's `quad` steps. The cut
 * foam is a box cut by straight lines, so every corner is convex and every blend takes foam off. A hard
 * edge's sharp bottom corner is a straight step and adds nothing (PV6). Proven against Green's theorem on
 * the curve itself and against ever-finer sampling, which converges on this figure (`finished-rail.test.ts`).
 */
export function railBlendArea(rail: FinishedRail): number {
  let area = 0;
  let at = rail.start;
  for (const step of rail.steps) {
    if (step.kind === "quad") {
      const v = step.control;
      const b = step.to;
      const triangle = Math.abs((v.x - at.x) * (b.y - at.y) - (v.y - at.y) * (b.x - at.x)) / 2;
      area += triangle / 3;
    }
    at = step.to;
  }
  return area;
}
