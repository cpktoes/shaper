/**
 * The finished rail — the shape a rail's cuts leave, with its corners rolled away (quick 261102-gec, R13;
 * plan 05's R22 and R23, 2026-11-02).
 *
 * A shaper cuts a rail as flat bands (Rail Band 1 and 2 on the deck, Rail Tuck 1 and 2 underneath, and
 * the dome on a domed deck), then rolls the corners between them away with a sanding block. This module
 * draws that rolled shape: each corner of the cut outline becomes a parabola that leaves each band at
 * exactly its middle. The founder picked this "Blended halfway" style over "One even round" on
 * 2026-11-02 (sketch 018, `.planning/sketches/018-finished-rail-curve/`). Blended halfway always meets
 * the rail line at the Apex Center on a tucked rail, because the corners at Rail Mark 1 and Rail Tuck 1
 * each reach halfway along the wall between them.
 *
 * WHERE THE RAIL MEETS THE DECK (plan 05, R23, PC35). The founder, 2026-11-02, after living with the
 * halfway blend: "the rail blending into the deck appears to have a bit of a knuckle. Can we smooth that
 * out, perhaps blending it better with regard to dome deck mark" — "worst with domed and mark close to
 * deck mark 3". Of the four candidates drawn on the Shortboard's tail they chose (d), one curve over both
 * corners, "with the hand-over made continuous first": only (d) cured the close-marks case (a 0.01" near-
 * corner became a 4.1" bend) and the flat tail's abrupt start (the bend now eases off the deck from
 * nothing). The rule, for a shaper: where the Domed Deck Band mark sits closer to Deck Mark 3 than half of
 * Band 2, the rail rolls off the deck in ONE smooth curve, starting on the deck beyond the dome mark and
 * running over both marks to Band 2's middle. As the dome mark moves out it slides steadily (weight
 * `deckBlendWeight`) into separate blends — on a domed deck a dome blend and a Deck Mark 3 blend that bend
 * alike where they meet (`matchedDomeReach`), on a flat deck today's halfway blend — complete once the run
 * between the marks is all of Band 2. The line never jumps as the dome slider moves. Every control point
 * is a blend of points on the cut outline, so the curve stays inside the cuts by construction; the deck
 * end stays tangent to the deck, Band 2's end to Band 2, and the join of the two domed pieces stays smooth
 * (G1) at every weight. Everything from Band 2's middle over the rail to the bottom is the halfway blend,
 * exactly as before. Called without a Domed Deck Band (`finishedRailFromCuts` with no `domedDeckBand`)
 * the deck corner blends halfway too: that is the reference page's own curve, kept for the golden.
 *
 * SHARP BOTTOM EDGE (plan 05, R22, PC38). The founder, 2026-11-02: "an advanced checkbox for leaving the
 * bottom edge fairly sharp (follow the angle at bottom tuck 3)". Ticked, the corner at Bottom Tuck 3 is
 * not rolled: the finished rail comes straight down the last tuck band at that band's own angle, meets the
 * bottom there as the cut leaves it, and runs along the bottom. Every other corner blends as before.
 *
 * It is what VOLUME counts (quick 261102-gec plan 03, the founder's D-V1, 2026-11-02: "Switch to the
 * finished curve"), as well as what RAILS draws. Volume takes it exactly, not by sampling: `railBlendArea`
 * is the foam the finished rail takes off ONE rail — the cut outline's own area less the area under the
 * finished curve by Green's theorem, in closed form for every line, parabola and cubic (plan 05, M27) —
 * and a station's finished area is its cut area (the faceted profile `rail-bands.ts` builds, proven to
 * enclose exactly the foam the cuts leave) less both rails' blend areas. `sectionFinishedRail` is the one
 * way volume reaches a section's finished rail, so the quoted litres and VOLUME's working rows can never
 * sit on different curves (PV2).
 *
 * INCH-DOMAIN CORE, Mm at the boundary, like `rail-bands.ts`: the private functions below are ported
 * statement for statement from the reference page's finish block (`reference/sketches/018-chris-rails-v2.js`,
 * `near`, `dist`, `lerp`, `quad`, `clip`, `foam`, `cutChain`, `blendRun` at f = 0.5 and `finishedCurve`),
 * with every tolerance kept, so the curve matches the page's own samples (proven against its golden).
 * Additions, the first two from sketch 018's own `blendRun` (index.html ~719-733), which the page's copy
 * leaves out:
 * - HARD EDGE. A tail with a hard edge keeps its bottom corner at (0, 0) sharp: no blend leaves it, so the
 *   finished rail runs straight down the rail wall to the corner and straight along the bottom. It is
 *   emitted as one straight `line` step to the corner with ONE sample of it (sketch 018 pushes 17 copies
 *   of the same point; the drawn shape is identical — PLANNER'S CHOICE PC13). The Apex Center rule does
 *   not apply to a hard edge: there is no Rail Tuck 1 below the apex to blend toward. The Sharp Bottom
 *   Edge corner is pushed the same way.
 * - STEPS. Alongside the page's samples the curve comes as drawing steps — a `line` to each blend's
 *   start, a `quad` with the corner as its control to the blend's end, a `cubic` for plan 05's deck
 *   corner, and a final `line` to the far end — so a drawing can render the exact curves rather than the
 *   samples. Every quad and cubic carries 17 samples.
 * - THE DECK CORNER (plan 05, above), worked out from the cut outline's own points, never from a flag.
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

/** One drawing step of the finished rail, in millimetres; each starts where the previous one ended. A
 * `cubic` (plan 05, PC36) is the deck corner's one smooth curve, `c1` and `c2` its two guide points. */
export type FinishedRailStep =
  | { kind: "line"; to: Point2D }
  | { kind: "quad"; control: Point2D; to: Point2D }
  | { kind: "cubic"; c1: Point2D; c2: Point2D; to: Point2D };

/** What a section adds to its cut lines (plan 05, PC36): its Domed Deck Band, which the deck corner's rule
 * reads (R23 — left out, the deck corner blends halfway as the reference page does), and its Sharp Bottom
 * Edge box (R22). */
export interface FinishedRailOptions {
  domedDeckBand?: Mm;
  sharpBottomEdge?: boolean;
}

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
type StepIn = { kind: "line"; to: P } | { kind: "quad"; control: P; to: P } | { kind: "cubic"; c1: P; c2: P; to: P };

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
 * the neighbouring band's reach. Plan 05: with a Domed Deck Band (`domeIn`, inches) the deck corner takes
 * PC35's rule (`deckCornerInches`) and the loop starts after it; with `sharpBottomEdge` the last corner,
 * Bottom Tuck 3's, stays sharp (PC38). */
function finishedCurveInches(
  cuts: CutIn[],
  bt: number,
  X0: number,
  hardEdge: boolean,
  domeIn: number | null = null,
  sharpBottomEdge = false,
) {
  const chain = cutChainInches(cuts, bt, X0);
  const n = chain.length - 1;
  const fullLen = chain.slice(0, -1).map((p, i) => dist(p, chain[i + 1]));
  const flat = fullLen.map((_, i) => i === 0 || i === n - 1);
  const f = 0.5;
  const pts: P[] = [chain[0]];
  const steps: StepIn[] = [];
  let first = 1;
  const deckCorner = domeIn === null ? null : deckCornerInches(chain, bt, domeIn);
  if (deckCorner) {
    steps.push(...deckCorner.steps);
    pts.push(...deckCorner.pts);
    first = deckCorner.next;
  }
  for (let i = first; i < n; i++) {
    const V = chain[i];
    const lIn = dist(chain[i - 1], V);
    const lOut = dist(V, chain[i + 1]);
    // Sketch 018: a hard edge's bottom corner stays sharp (PC13: one straight step, one sample). Plan 05
    // (R22, PC38): so does the last corner when Sharp Bottom Edge is ticked and it sits on the bottom away
    // from the rail — Bottom Tuck 3's. The blend before it ends at the last tuck band's middle, so the
    // straight step runs down that band at its own angle; on a hard edge the last corner is (0, 0), sharp
    // already, so the box changes nothing there.
    const sharp =
      (hardEdge && Math.abs(V[0]) < 1e-6 && Math.abs(V[1]) < 1e-6) ||
      (sharpBottomEdge && i === n - 1 && Math.abs(V[1]) < 1e-6 && V[0] < -1e-6);
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
// Plan 05's deck corner (R23, PC35) — inch-domain helpers.
// ---------------------------------------------------------------------------------------------

/** How far the deck-side curve may reach out along the full-thickness deck: 2", because the drawing's left
 * edge sits 2" beyond the Domed Deck Band (`railPlotBounds`, rule 12) — the curve never runs off the plot.
 * It also caps the matched dome blend, which is why that shape carries a straight stretch on a very long
 * run. */
export const DECK_BLEND_MAX_REACH_IN = 2;

const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const times = (a: P, k: number): P => [a[0] * k, a[1] * k];
const crossP = (a: P, b: P) => a[0] * b[1] - a[1] * b[0];
const unit = (a: P): P => times(a, 1 / Math.hypot(a[0], a[1]));

/** A point on the cubic P0-P1-P2-P3 at parameter t (Bernstein form). */
const cubicPoint = (P0: P, P1: P, P2: P, P3: P, t: number): P => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * P0[0] + b * P1[0] + c * P2[0] + d * P3[0], a * P0[1] + b * P1[1] + c * P2[1] + d * P3[1]];
};

/** The parabola P0-C-P2 written as a cubic (degree raising): the same curve with four control points, so
 * it can be blended point by point with a cubic. */
const raise = (P0: P, C: P, P2: P): P[] => [P0, lerp(P0, C, 2 / 3), lerp(P2, C, 2 / 3), P2];

/** Two control polygons blended point by point at weight w: w = 0 is the first, w = 1 the second. */
const lerpPts = (a: P[], b: P[], w: number): P[] => a.map((p, i) => lerp(p, b[i], w));

/** De Casteljau's split of a cubic at t: the two cubics that together are the same curve. */
function splitCubic(K: P[], t: number): [P[], P[]] {
  const [P0, P1, P2, P3] = K;
  const P01 = lerp(P0, P1, t);
  const P12 = lerp(P1, P2, t);
  const P23 = lerp(P2, P3, t);
  const P012 = lerp(P01, P12, t);
  const P123 = lerp(P12, P23, t);
  const J = lerp(P012, P123, t);
  return [
    [P0, P01, P012, J],
    [J, P123, P23, P3],
  ];
}

/** The 17 samples every blend carries, for a cubic and for a parabola. */
const cubicSamples = (K: P[]): P[] =>
  Array.from({ length: 17 }, (_, s) => cubicPoint(K[0], K[1], K[2], K[3], s / 16));
const quadSamples = (A: P, V: P, B: P): P[] => Array.from({ length: 17 }, (_, s) => quad(A, V, B, s / 16));

/** The hand-over weight w (PC35): 0 while the run from Deck Mark 3 to the dome mark is no longer than half
 * of Band 2 — the one curve — rising steadily to 1 once the run is all of Band 2 — the separate blends.
 * Inches. */
export function deckBlendWeight(run: number, halfBand2: number): number {
  if (!(halfBand2 > 0)) return 1;
  return Math.min(1, Math.max(0, (run - halfBand2) / halfBand2));
}

/** How far the dome blend reaches along the dome band when it and the Deck Mark 3 blend bend alike where
 * they meet (the matched blends; inches). The dome blend has even legs r and ends bending sin(dome) / 2r;
 * the Deck Mark 3 blend has legs s (along the dome band) and L (half of Band 2) and starts bending
 * L sin(DM3) / 2s². Equal bends with r + s = the run m give sin(dome) s² + L sin(DM3) s - L sin(DM3) m = 0,
 * solved here in the form that stays exact when either turn is nil. Returns r = m - s. */
export function matchedDomeReach(m: number, sinDome: number, halfBand2: number, sinDeckMark3: number): number {
  const k = halfBand2 * sinDeckMark3;
  const root = Math.sqrt(k * k + 4 * sinDome * k * m);
  const s = k + root > 0 ? (2 * k * m) / (k + root) : m;
  return m - s;
}

interface DeckCorner {
  steps: StepIn[];
  pts: P[];
  /** The chain index the halfway loop carries on from: the Deck Mark 2 corner. */
  next: number;
}

/**
 * The deck corner by PC35 (R23, the founder's one-curve rule made continuous), from the cut chain's own
 * points. D is the dome mark, V Deck Mark 3's corner, A Band 2's middle (exactly where the halfway blends
 * meet), L half of Band 2 and m the run from D to V. The deck is domed here when the chain's second point
 * is the dome mark and its third sits below the deck; otherwise it is flat, V the second point and the dome
 * mark on the deck run before it. Returns null — today's halfway blend — when the chain is too short or the
 * dome mark is not between the drawing's edge and V (PC36's guard; no real board reaches it), and on a flat
 * deck once the hand-over is complete (w = 1 there is today's blend).
 */
function deckCornerInches(chain: P[], bt: number, domeIn: number): DeckCorner | null {
  const n = chain.length - 1;
  const edge = chain[0];
  const Dmark: P = [-domeIn, bt];
  const domed = chain.length > 3 && near(chain[1], Dmark) && chain[2][1] < bt - 1e-6;
  const iV = domed ? 2 : 1;
  // The halfway loop must still have the Deck Mark 2 corner, and a corner after it, to carry on from.
  if (iV + 1 > n - 1) return null;
  const V = chain[iV];
  const N = chain[iV + 1];
  const D = domed ? chain[1] : Dmark;
  if (!domed && !(Math.abs(V[1] - bt) < 1e-6 && D[0] > edge[0] + 1e-9 && D[0] < V[0] - 1e-9)) return null;
  // Band 2's middle, worked out exactly as the halfway loop works out the next blend's start.
  const A = lerp(N, V, 0.5);
  const L = dist(V, A);
  const m = dist(D, V);
  if (!(L > 1e-9) || !(m > 1e-9)) return null;
  const w = deckBlendWeight(m, L);
  if (!domed && w >= 1) return null;

  const toEdge = unit(sub(edge, D)); // along the full-thickness deck, away from the rail
  const room = dist(edge, D);
  const Fd = add(D, times(toEdge, Math.min(L, DECK_BLEND_MAX_REACH_IN, room)));
  const Kd: P[] = [Fd, D, V, A];
  const next = iV + 1;

  if (w <= 0) {
    // A short run: one cubic from the deck beyond the dome mark, guided by the dome mark then Deck Mark 3.
    return {
      steps: [
        { kind: "line", to: Fd },
        { kind: "cubic", c1: D, c2: V, to: A },
      ],
      pts: cubicSamples(Kd),
      next,
    };
  }

  if (!domed) {
    // Flat, mid hand-over: the one curve's shape frozen where the run equals L (so w = 0 joins it exactly),
    // blended into today's parabola raised a degree (so w = 1 is today's blend).
    const S = add(V, times(toEdge, L));
    const reach = L + Math.min(L, DECK_BLEND_MAX_REACH_IN, dist(edge, V) - L);
    const Kf: P[] = [add(V, times(toEdge, reach)), S, V, A];
    const K = lerpPts(Kf, raise(S, V, A), w);
    return {
      steps: [
        { kind: "line", to: K[0] },
        { kind: "cubic", c1: K[1], c2: K[2], to: K[3] },
      ],
      pts: cubicSamples(K),
      next,
    };
  }

  // Domed: the matched blends — a dome blend with even legs r and a Deck Mark 3 blend from s along the dome
  // band to Band 2's middle, bending alike where they meet, joined by a straight stretch only when the 2"
  // reach caps r.
  const u = unit(sub(V, D)); // along the dome band, toward the rail
  const sinDome = Math.abs(crossP(times(toEdge, -1), u));
  const sinV = Math.abs(crossP(u, unit(sub(A, V))));
  const rMatch = matchedDomeReach(m, sinDome, L, sinV);
  const s = Math.min(L, m - rMatch);
  const r = Math.min(m - s, DECK_BLEND_MAX_REACH_IN, room);
  const Fb = add(D, times(toEdge, r));
  const Q1 = add(D, times(u, r));
  const Q2 = add(D, times(u, m - s));

  if (w >= 1) {
    return {
      steps: [
        { kind: "line", to: Fb },
        { kind: "quad", control: D, to: Q1 },
        { kind: "line", to: Q2 },
        { kind: "quad", control: V, to: A },
      ],
      pts: [...quadSamples(Fb, D, Q1), ...quadSamples(Q2, V, A)],
      next,
    };
  }

  // Domed, mid hand-over: split the one curve where its tangent runs along the dome band (τ in closed
  // form — the middle term vanishes because V - D runs along u), then blend each piece with the matched
  // blends' own piece. The join's three points stay on a line along the dome band in both end shapes, so
  // the curve is smooth there at every weight.
  const c0 = crossP(sub(D, Fd), u);
  const c2 = crossP(sub(A, V), u);
  const ratio = -c2 / c0;
  if (!(ratio > 0) || !Number.isFinite(ratio)) return null;
  const tau = 1 / (1 + Math.sqrt(ratio));
  const [first, second] = splitCubic(Kd, tau);
  const K1 = lerpPts(first, raise(Fb, D, Q1), w);
  const K2 = lerpPts(second, raise(Q2, V, A), w);
  return {
    steps: [
      { kind: "line", to: K1[0] },
      { kind: "cubic", c1: K1[1], c2: K1[2], to: K1[3] },
      { kind: "line", to: K2[0] },
      { kind: "cubic", c1: K2[1], c2: K2[2], to: K2[3] },
    ],
    pts: [...cubicSamples(K1), ...cubicSamples(K2)],
    next,
  };
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

/** A drawing step from the inch core, in millimetres. */
function stepToMm(s: StepIn): FinishedRailStep {
  if (s.kind === "line") return { kind: "line", to: toMm(s.to) };
  if (s.kind === "quad") return { kind: "quad", control: toMm(s.control), to: toMm(s.to) };
  return { kind: "cubic", c1: toMm(s.c1), c2: toMm(s.c2), to: toMm(s.to) };
}

/** The finished rail from a section's cut lines, its board thickness, the drawing's left edge and whether
 * its bottom corner is a hard edge. `options` (plan 05, PC36): the section's Domed Deck Band, which turns on
 * the founder's deck-corner rule (R23 — without it the deck corner blends halfway, the reference page's own
 * curve), and its Sharp Bottom Edge box (R22). */
export function finishedRailFromCuts(
  cuts: readonly RailCutLine[],
  boardThickness: Mm,
  x0: Mm,
  hardEdge: boolean,
  options: FinishedRailOptions = {},
): FinishedRail {
  const r = finishedCurveInches(
    cutsToInches(cuts),
    mmToInches(boardThickness),
    mmToInches(x0),
    hardEdge,
    options.domedDeckBand === undefined ? null : mmToInches(options.domedDeckBand),
    options.sharpBottomEdge === true,
  );
  return {
    start: toMm(r.chain[0]),
    steps: r.steps.map(stepToMm),
    samples: r.pts.map(toMm),
    chain: r.chain.map(toMm),
  };
}

/** The finished rail as an SVG path (quick 261102-gec plan 02, PC22, 2026-11-02): `M` at the deck end, then
 * one `L` per straight step, one `Q` per blend and one `C` per cubic (plan 05's deck corner), each point
 * passed through `project` — the drawing's own mapping from a section's millimetres to its coordinates, so
 * the curve lands exactly on the drawn bands. `closed` adds the close along the drawing's left edge (from
 * the bottom's end back up to the deck's), so the shape can be filled with the board's colour. The path is
 * exact: the parabolas and cubics themselves, not samples. */
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
    if (step.kind === "line") parts.push(`L ${pt(step.to)}`);
    else if (step.kind === "quad") parts.push(`Q ${pt(step.control)} ${pt(step.to)}`);
    else parts.push(`C ${pt(step.c1)} ${pt(step.c2)} ${pt(step.to)}`);
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

/** A section's own options for its finished rail (plan 05, PC36): its Domed Deck Band, so the deck corner
 * takes the founder's rule (R23), and its Sharp Bottom Edge box (R22). */
const optionsOf = (result: RailSectionResult): FinishedRailOptions => ({
  domedDeckBand: result.domedDeckBand,
  sharpBottomEdge: result.sharpBottomEdge,
});

/** The finished rail of one computed rail section, drawn from the drawing's left edge `x0`. */
export function finishedRail(output: RailSectionOutput, x0: Mm): FinishedRail {
  return finishedRailFromCuts(
    cutsOf(output.segments, output.domed),
    output.boardThickness,
    x0,
    output.result.hardEdge,
    optionsOf(output.result),
  );
}

/**
 * The finished rail of a bare section result — what volume counts at each of its 51 stations, which have
 * no drawing output of their own (quick 261102-gec plan 03, D-V1). The cuts are chosen exactly as
 * `finishedRail` chooses them, from `buildRailSegments(result)`; the left edge is the section's own plot
 * edge, 2" beyond its Domed Deck Band (`railPlotBounds`, rule 12), so this is the very curve RAILS draws
 * for that section (PV4 — measured: twice as far changes no blend area by more than 1.1e-13 mm² on the
 * presets, because every blend is set by the bands, not by how far the flats run); the hard edge, the
 * Domed Deck Band and the Sharp Bottom Edge box come from the result (plan 05).
 */
export function sectionFinishedRail(result: RailSectionResult, domed: boolean): FinishedRail {
  return finishedRailFromCuts(
    cutsOf(buildRailSegments(result), domed),
    result.boardThickness,
    railPlotBounds(result).xAxisMin,
    result.hardEdge,
    optionsOf(result),
  );
}

/** A point in any unit, for the closed-form area helpers below. */
type XY = Readonly<{ x: number; y: number }>;
const crossXY = (a: XY, b: XY) => a.x * b.y - b.x * a.y;

/**
 * The signed Green's-theorem term of one cubic Bézier from P0 to P3 (guide points P1, P2): half the integral
 * of x dy - y dx along it, in closed form (plan 05, PC35's area rule). Add the line terms (P0×P1 / 2) and
 * the parabola terms ((2·P0×C + 2·C×P2 + P0×P2) / 6) round a closed curve and the sum is its area, exactly.
 * Any unit in, that unit squared out.
 */
export function cubicArea(p0: XY, p1: XY, p2: XY, p3: XY): number {
  return (
    (6 * crossXY(p0, p1) +
      3 * crossXY(p0, p2) +
      crossXY(p0, p3) +
      3 * crossXY(p1, p2) +
      3 * crossXY(p1, p3) +
      6 * crossXY(p2, p3)) /
    20
  );
}

/**
 * The area between a cubic and its own control polygon P0-P1-P2-P3 (closed by the chord): the cubic's
 * counterpart of a parabola's third of its triangle (plan 05). With a, b, c the guide points and the end,
 * each taken from P0, it is |7·(a×b) + 4·(b×c) - 3·(a×c)| / 20 — the polygon's own area, (a×b + b×c) / 2,
 * less the cubic's. Any unit in, that unit squared out.
 */
export function cubicBlendArea(p0: XY, p1: XY, p2: XY, p3: XY): number {
  const a = { x: p1.x - p0.x, y: p1.y - p0.y };
  const b = { x: p2.x - p0.x, y: p2.y - p0.y };
  const c = { x: p3.x - p0.x, y: p3.y - p0.y };
  return Math.abs(7 * crossXY(a, b) + 4 * crossXY(b, c) - 3 * crossXY(a, c)) / 20;
}

/**
 * The foam the finished rail takes off ONE rail, in square millimetres, exactly (quick 261102-gec plan 03,
 * D-V1, PV1; plan 05, PC35/PC36): the cut outline's own area (the chain, closed along the drawing's left
 * edge — the shoelace) less the area under the finished curve, closed the same way, by Green's theorem —
 * exact in closed form for every line, parabola and cubic step (`cubicArea`). Both shapes share the deck
 * end, the bottom end and the closing edge, so the difference is exactly what the blends roll away.
 *
 * For a curve made only of parabolas (every curve before plan 05, and every corner but the deck's since)
 * this equals plan 03's rule, a third of each corner's triangle A-V-B (Archimedes' quadrature: the two cut
 * runs are the parabola's own tangents at its ends) — `finished-rail.test.ts` proves the two agree. A hard
 * edge's or a Sharp Bottom Edge's corner is a straight step and takes nothing off (PV6, R22). Proven against
 * the per-piece rule (a third per parabola, `cubicBlendArea` per cubic, over the polygon through every
 * control point) and against ever-finer sampling, which converges on this figure (M27).
 */
export function railBlendArea(rail: FinishedRail): number {
  const chain = rail.chain;
  let cut = 0;
  for (let i = 0; i < chain.length; i++) cut += crossXY(chain[i], chain[(i + 1) % chain.length]) / 2;
  let curve = 0;
  let at: XY = rail.start;
  for (const step of rail.steps) {
    if (step.kind === "line") curve += crossXY(at, step.to) / 2;
    else if (step.kind === "quad")
      curve += (2 * crossXY(at, step.control) + 2 * crossXY(step.control, step.to) + crossXY(at, step.to)) / 6;
    else curve += cubicArea(at, step.c1, step.c2, step.to);
    at = step.to;
  }
  curve += crossXY(at, rail.start) / 2;
  return (cut - curve) * (Math.sign(cut) || 1);
}
