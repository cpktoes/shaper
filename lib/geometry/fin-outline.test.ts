import { describe, expect, it } from "vitest";
import { deriveEffectiveFins } from "./design";
import {
  FIN_CUBIC_SAMPLES,
  FIN_ROLE_SHAPES,
  FIN_TIP_ARC_SAMPLES,
  finOutline,
  placedFins,
  type FinOutline,
} from "./fin-outline";
import { computeFinPlacement, importedFinTailFromOutline, type FinMark, type FinPlacementSpec } from "./fins";
import { buildOutline } from "./outline";
import { BOARD_PRESETS, type BoardPreset } from "./presets";
import { inchesToMm, mm, type Mm } from "./units";

/**
 * The 3D board's fins (Phase 16, D-21, D-25). Every expected value is worked out here from FINS' own marks and the
 * role's figures — never typed (C1).
 */

const TOL = 1e-9;

function preset(id: BoardPreset["id"]): BoardPreset {
  const found = BOARD_PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`no ${id} preset`);
  return found;
}

/** FINS' marks for a preset as the store opens it (Import Template on), or switched to another spec. */
function marksOf(p: BoardPreset, fins: FinPlacementSpec = p.fins): { marks: FinMark[]; spec: FinPlacementSpec } {
  const geometry = buildOutline(p.outline);
  const spec = deriveEffectiveFins(fins, true, p.outline, geometry);
  return { marks: computeFinPlacement(spec, importedFinTailFromOutline(geometry)).marks, spec };
}

/** A rocker for the placement tests: a plain curve, rising toward both tips, so it has a slope at every fin. */
function rockerFor(length: Mm) {
  return (s: Mm): Mm => {
    const t = s / length - 0.5;
    return mm(80 * t * t + 6 * t);
  };
}

function highest(outline: FinOutline): number {
  return Math.max(...outline.points.map((p) => p.v));
}

describe("finOutline", () => {
  it("is the thruster's figures from D-25 (three alike, 4.5\" deep, tip 0.75\" behind, 0.35\" tip, 1/4\" thick)", () => {
    expect(FIN_ROLE_SHAPES.thruster).toEqual({ depthIn: 4.5, tipBehindIn: 0.75, tipRadiusIn: 0.35, thicknessIn: 0.25 });
  });

  it("closes along its base: from (0, 0) up the leading edge, round the tip and down to (B, 0)", () => {
    const base = inchesToMm(4.5);
    const depth = inchesToMm(FIN_ROLE_SHAPES.thruster.depthIn);
    const o = finOutline("thruster", base, depth);
    expect(o.points).toHaveLength(2 * FIN_CUBIC_SAMPLES + FIN_TIP_ARC_SAMPLES);
    expect(o.points[0]).toEqual({ u: 0, v: 0 });
    expect(o.points.at(-1)).toEqual({ u: base, v: 0 });
    // The base spans exactly [0, B] at v = 0: no other point lies on or below it.
    for (const p of o.points.slice(1, -1)) expect(p.v).toBeGreaterThan(0);
    // The highest point is the depth, reached at the rounded tip's top.
    expect(Math.abs(highest(o) - depth)).toBeLessThan(TOL);
    expect(o.points[o.tipFrom].v).toBeCloseTo(depth, 9);
    expect(o.base).toBe(base);
    expect(o.depth).toBe(depth);
    expect(o.tipBehind).toBeCloseTo(inchesToMm(FIN_ROLE_SHAPES.thruster.tipBehindIn), 9);
    expect(o.thickness).toBeCloseTo(inchesToMm(FIN_ROLE_SHAPES.thruster.thicknessIn), 9);
    // The tip sits behind the trailing edge, and the rounding stays inside the corner T = (B + R, D).
    const rearmost = Math.max(...o.points.map((p) => p.u));
    expect(rearmost).toBeGreaterThan(base);
    expect(rearmost).toBeLessThanOrEqual(base + o.tipBehind + TOL);
  });

  it("is a simple outline: no edge crosses another", () => {
    const o = finOutline("thruster", inchesToMm(4.5), inchesToMm(4.5));
    const pts = [...o.points, o.points[0]];
    const cross = (a: (typeof pts)[0], b: (typeof pts)[0], c: (typeof pts)[0], d: (typeof pts)[0]) => {
      const o1 = (b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u);
      const o2 = (b.u - a.u) * (d.v - a.v) - (b.v - a.v) * (d.u - a.u);
      const o3 = (d.u - c.u) * (a.v - c.v) - (d.v - c.v) * (a.u - c.u);
      const o4 = (d.u - c.u) * (b.v - c.v) - (d.v - c.v) * (b.u - c.u);
      return o1 * o2 < 0 && o3 * o4 < 0;
    };
    for (let i = 0; i + 1 < pts.length; i++) {
      for (let j = i + 2; j + 1 < pts.length; j++) {
        if (i === 0 && j === pts.length - 2) continue;
        expect(cross(pts[i], pts[i + 1], pts[j], pts[j + 1])).toBe(false);
      }
    }
  });
});

describe("placedFins on the Shortboard's thruster", () => {
  const p = preset("shortboard");
  const { marks, spec } = marksOf(p);
  const rockerAt = rockerFor(p.outline.length);
  const fins = placedFins(marks, spec.finSetup, spec.twinTemplate, p.outline.length, rockerAt);

  it("stands all three fins", () => {
    expect(spec.finSetup).toBe("thruster");
    expect(marks).toHaveLength(3);
    expect(fins).toHaveLength(marks.length);
  });

  it("gives every fin FINS' own base, the thruster's depth, and its base on the mark's FINS line", () => {
    fins.forEach((fin, i) => {
      const mark = marks[i];
      expect(fin.role).toBe("thruster");
      expect(Math.abs(fin.outline.base - mark.baseLength)).toBeLessThan(TOL);
      expect(Math.abs(fin.outline.depth - inchesToMm(FIN_ROLE_SHAPES.thruster.depthIn))).toBeLessThan(TOL);
      // The base line runs from the mark's leading point to its trailing point (toe included).
      expect(fin.leading[0]).toBe(mark.leadingOffTail);
      expect(fin.leading[1]).toBe(mark.leadingLateral);
      expect(fin.trailing[0]).toBe(mark.offTail);
      expect(fin.trailing[1]).toBe(mark.lateral);
    });
    // The side fins carry FINS' toe: their leading edges sit nearer the stringer than their trailing edges.
    for (const fin of fins.filter((f) => f.trailing[1] !== 0)) {
      expect(Math.abs(fin.leading[1])).toBeLessThan(Math.abs(fin.trailing[1]));
    }
  });

  it("puts each base on the bottom at the fin's centre, tilted by the rocker's slope there", () => {
    fins.forEach((fin) => {
      const centre = (fin.leading[0] + fin.trailing[0]) / 2;
      expect(fin.rootZ).toBeCloseTo(rockerAt(mm(centre)), 9);
      expect(fin.leading[2]).toBe(fin.rootZ);
      expect(fin.trailing[2]).toBe(fin.rootZ);
      const slope = (rockerAt(mm(centre + 1)) - rockerAt(mm(centre - 1))) / 2;
      expect(fin.tiltRad).toBeCloseTo(Math.atan(slope), 9);
      expect(fin.thickness).toBeCloseTo(inchesToMm(FIN_ROLE_SHAPES.thruster.thicknessIn), 9);
    });
  });

  it("leaves out a fin whose figures are not usable numbers, and keeps the rest (T-16-22)", () => {
    const broken = marks.map((m, i) => (i === 0 ? { ...m, baseLength: mm(Number.NaN) } : m));
    const zero = marks.map((m, i) => (i === 1 ? { ...m, baseLength: mm(0) } : m));
    const nowhere = marks.map((m, i) => (i === 2 ? { ...m, offTail: mm(Number.POSITIVE_INFINITY) } : m));
    for (const set of [broken, zero, nowhere]) {
      expect(placedFins(set, spec.finSetup, spec.twinTemplate, p.outline.length, rockerAt)).toHaveLength(marks.length - 1);
    }
  });
});
