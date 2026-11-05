import { describe, expect, it } from "vitest";
import { deriveEffectiveFins } from "./design";
import {
  FIN_CUBIC_SAMPLES,
  FIN_ROLE_SHAPES,
  FIN_SINGLE_SHAPE,
  FIN_TIP_ARC_SAMPLES,
  finOutline,
  finOutlineRole,
  placedFins,
  singleFinDepth,
  type FinOutline,
  type FinOutlineRole,
  type PlacedFin,
} from "./fin-outline";
import {
  computeFinPlacement,
  importedFinTailFromOutline,
  resetAdvanced,
  type FinMark,
  type FinPlacementSpec,
  type FinSetup,
  type TwinTemplate,
} from "./fins";
import { buildOutline } from "./outline";
import { BOARD_PRESETS, type BoardPreset } from "./presets";
import { inchesToMm, mm, mmToFeet, type Mm } from "./units";

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
  it("carries D-25's figures for every role", () => {
    // Thruster (and a quad's fronts): three alike, 4.5" deep, the tip 0.75" behind, a 0.35" tip, 1/4" thick.
    expect(FIN_ROLE_SHAPES.thruster).toEqual({ depthIn: 4.5, tipBehindIn: 0.75, tipRadiusIn: 0.35, thicknessIn: 0.25 });
    // Twin: 5.0" deep; upright tip 0.75" behind, a keel's above the trailing edge; a 0.5" tip; 1/4" thick.
    expect(FIN_ROLE_SHAPES.twinUpright).toEqual({ depthIn: 5, tipBehindIn: 0.75, tipRadiusIn: 0.5, thicknessIn: 0.25 });
    expect(FIN_ROLE_SHAPES.twinKeel).toEqual({ depthIn: 5, tipBehindIn: 0, tipRadiusIn: 0.5, thicknessIn: 0.25 });
    // A quad's rears: 4.25" deep, otherwise the thruster's.
    expect(FIN_ROLE_SHAPES.quadRear).toEqual({ depthIn: 4.25, tipBehindIn: 0.75, tipRadiusIn: 0.35, thicknessIn: 0.25 });
    // A single: its depth from the board's length; base 0.70 of it, tip 0.15 of it behind, a 0.5" tip, 3/8" thick.
    expect(FIN_SINGLE_SHAPE).toEqual({ baseOfDepth: 0.7, tipBehindOfDepth: 0.15, tipRadiusIn: 0.5, thicknessIn: 0.375 });
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

describe("singleFinDepth (D-22: the board's length in feet, read as inches)", () => {
  it("draws a 9'0\" board's single 9\" deep and a 7'6\" board's 7.5\"", () => {
    expect(singleFinDepth(inchesToMm(108))).toBeCloseTo(inchesToMm(9), 9);
    expect(singleFinDepth(inchesToMm(90))).toBeCloseTo(inchesToMm(7.5), 9);
  });

  it("is the length in feet, as inches, for any board", () => {
    for (const p of BOARD_PRESETS) {
      expect(singleFinDepth(p.outline.length)).toBeCloseTo(inchesToMm(mmToFeet(p.outline.length)), 9);
    }
  });
});

/** Each preset as opened, then switched to every fin setup (each twin template) with FINS' own Reset (the q-fins idiom). */
const SETUPS: { setup: FinSetup; twin?: TwinTemplate }[] = [
  { setup: "single" },
  { setup: "twin", twin: "upright" },
  { setup: "twin", twin: "keel" },
  { setup: "twin", twin: "trailer" },
  { setup: "thruster" },
  { setup: "2plus1" },
  { setup: "quad" },
];

function switched(p: BoardPreset, setup: FinSetup, twin?: TwinTemplate): FinPlacementSpec {
  return { ...p.fins, finSetup: setup, twinTemplate: twin ?? p.fins.twinTemplate, advanced: resetAdvanced(setup) };
}

function placed(p: BoardPreset, fins: FinPlacementSpec = p.fins) {
  const { marks, spec } = marksOf(p, fins);
  const rockerAt = rockerFor(p.outline.length);
  return { marks, spec, rockerAt, fins: placedFins(marks, spec.finSetup, spec.twinTemplate, p.outline.length, rockerAt) };
}

/** What D-25 says each mark should draw as, worked out from the setup and the mark's role alone. */
function expectedRole(setup: FinSetup, twin: TwinTemplate, mark: FinMark): FinOutlineRole {
  if (setup === "single") return "single";
  if (setup === "2plus1") return mark.role === "center" ? "single" : "thruster";
  if (setup === "twin") {
    if (twin === "keel") return "twinKeel";
    if (twin === "trailer") return mark.role === "center" ? "thruster" : "twinUpright";
    return "twinUpright";
  }
  if (setup === "quad") return mark.role === "rear" ? "quadRear" : "thruster";
  return "thruster";
}

/** The rule's expected base, depth and FINS line for one placed fin. */
function expectFinTrueToFins(fin: PlacedFin, mark: FinMark, role: FinOutlineRole, length: Mm) {
  expect(fin.role).toBe(role);
  if (role === "single") {
    const depth = singleFinDepth(length);
    const base = FIN_SINGLE_SHAPE.baseOfDepth * depth;
    const trailing = mark.offTail + (mark.baseLength - base) / 2;
    expect(fin.outline.depth).toBeCloseTo(depth, 9);
    expect(fin.outline.base).toBeCloseTo(base, 9);
    // Centred in FINS' box: never the box's own length.
    expect(fin.outline.base).toBeLessThan(mark.baseLength);
    expect(fin.trailing[0]).toBeCloseTo(trailing, 9);
    expect(fin.leading[0]).toBeCloseTo(trailing + base, 9);
    expect(fin.trailing[1]).toBe(0);
    expect(fin.leading[1]).toBe(0);
    expect(fin.outline.tipBehind).toBeCloseTo(FIN_SINGLE_SHAPE.tipBehindOfDepth * depth, 9);
    expect(fin.thickness).toBeCloseTo(inchesToMm(FIN_SINGLE_SHAPE.thicknessIn), 9);
    return;
  }
  const shape = FIN_ROLE_SHAPES[role];
  expect(Math.abs(fin.outline.base - mark.baseLength)).toBeLessThan(TOL);
  expect(fin.outline.depth).toBeCloseTo(inchesToMm(shape.depthIn), 9);
  expect(fin.outline.tipBehind).toBeCloseTo(inchesToMm(shape.tipBehindIn), 9);
  expect(fin.thickness).toBeCloseTo(inchesToMm(shape.thicknessIn), 9);
  expect(fin.trailing[0]).toBe(mark.offTail);
  expect(fin.trailing[1]).toBe(mark.lateral);
  expect(fin.leading[0]).toBe(mark.leadingOffTail);
  expect(fin.leading[1]).toBe(mark.leadingLateral);
}

describe("every fin system, each fin's base true to FINS", () => {
  for (const p of BOARD_PRESETS) {
    it(`${p.name} as opened`, () => {
      const { marks, spec, fins } = placed(p);
      expect(fins).toHaveLength(marks.length);
      fins.forEach((fin, i) => {
        const role = expectedRole(spec.finSetup, spec.twinTemplate, marks[i]);
        expect(finOutlineRole(spec.finSetup, spec.twinTemplate, marks[i])).toBe(role);
        expectFinTrueToFins(fin, marks[i], role, p.outline.length);
      });
    });
    for (const { setup, twin } of SETUPS) {
      it(`${p.name} switched to ${setup}${twin ? ` (${twin})` : ""}`, () => {
        const { marks, spec, fins } = placed(p, switched(p, setup, twin));
        expect(spec.finSetup).toBe(setup);
        expect(fins).toHaveLength(marks.length);
        fins.forEach((fin, i) =>
          expectFinTrueToFins(fin, marks[i], expectedRole(setup, spec.twinTemplate, marks[i]), p.outline.length),
        );
      });
    }
  }

  it("draws the Longboard's single from its length, centred in the box", () => {
    const p = preset("longboard");
    const { marks, spec, fins } = placed(p);
    expect(spec.finSetup).toBe("single");
    expect(marks).toHaveLength(1);
    expect(fins[0].role).toBe("single");
    expect(fins[0].outline.depth).toBeCloseTo(singleFinDepth(p.outline.length), 9);
  });

  it("gives the 2+1's centre the single's rule and its side bites the thruster's outline", () => {
    const p = preset("midlength");
    const { marks, fins } = placed(p, switched(p, "2plus1"));
    const roles = fins.map((f) => f.role);
    expect(roles.filter((r) => r === "single")).toHaveLength(marks.filter((m) => m.role === "center").length);
    expect(roles.filter((r) => r === "thruster")).toHaveLength(marks.filter((m) => m.role !== "center").length);
    expect(roles).toContain("single");
    expect(roles).toContain("thruster");
  });

  it("draws the Fish's upright twin 5.0\" deep with its tip 0.75\" behind, and a keel's tip above the trailing edge", () => {
    const p = preset("fish");
    const upright = placed(p);
    expect(upright.spec.twinTemplate).toBe("upright");
    for (const fin of upright.fins) {
      expect(fin.role).toBe("twinUpright");
      expect(fin.outline.depth).toBeCloseTo(inchesToMm(FIN_ROLE_SHAPES.twinUpright.depthIn), 9);
      expect(fin.outline.tipBehind).toBeCloseTo(inchesToMm(FIN_ROLE_SHAPES.twinUpright.tipBehindIn), 9);
    }
    const keel = placed(p, switched(p, "twin", "keel"));
    keel.fins.forEach((fin, i) => {
      expect(fin.role).toBe("twinKeel");
      expect(fin.outline.tipBehind).toBe(0);
      // The base is FINS' own, the default keel's 4.5" included (K5).
      expect(Math.abs(fin.outline.base - keel.marks[i].baseLength)).toBeLessThan(TOL);
      // The rounded tip's top sits over the base, not behind it.
      expect(fin.outline.points[fin.outline.tipFrom].u).toBeLessThanOrEqual(fin.outline.base);
    });
  });

  it("draws a quad's rears a touch shallower than its fronts, every base FINS' own, and its centre fin as a thruster's", () => {
    const p = preset("midlength");
    const { marks, spec, fins } = placed(p);
    expect(spec.finSetup).toBe("quad");
    fins.forEach((fin, i) => {
      const mark = marks[i];
      expect(Math.abs(fin.outline.base - mark.baseLength)).toBeLessThan(TOL);
      if (mark.role === "rear") expect(fin.outline.depth).toBeCloseTo(inchesToMm(FIN_ROLE_SHAPES.quadRear.depthIn), 9);
      else expect(fin.outline.depth).toBeCloseTo(inchesToMm(FIN_ROLE_SHAPES.thruster.depthIn), 9);
    });
    const rear = fins.find((f) => f.role === "quadRear");
    const front = fins.find((_, i) => marks[i].role === "front");
    expect(rear && front && rear.outline.depth < front.outline.depth).toBe(true);
    expect(marks.some((m) => m.role === "center")).toBe(true);
    expect(fins[marks.findIndex((m) => m.role === "center")].role).toBe("thruster");
  });

  it("draws an Upright + Trailer twin's mains as upright twins and its centre trailer as a thruster's, base from FINS", () => {
    const p = preset("fish");
    const { marks, fins } = placed(p, switched(p, "twin", "trailer"));
    expect(marks.some((m) => m.role === "center")).toBe(true);
    fins.forEach((fin, i) => {
      expect(fin.role).toBe(marks[i].role === "center" ? "thruster" : "twinUpright");
      expect(Math.abs(fin.outline.base - marks[i].baseLength)).toBeLessThan(TOL);
    });
  });
});

describe("the founder's rule: changing the base moves only the leading edge", () => {
  const ROLES: FinOutlineRole[] = ["single", "twinUpright", "twinKeel", "thruster", "quadRear"];
  for (const role of ROLES) {
    it(role, () => {
      const depth = role === "single" ? singleFinDepth(inchesToMm(108)) : inchesToMm(FIN_ROLE_SHAPES[role].depthIn);
      const small = finOutline(role, inchesToMm(3.5), depth);
      const large = finOutline(role, inchesToMm(6.25), depth);
      expect(small.points).toHaveLength(large.points.length);
      expect(small.tipFrom).toBe(large.tipFrom);
      // From the tip's rounding down the trailing edge, relative to the trailing edge (u − B): identical.
      for (let i = small.tipFrom; i < small.points.length; i++) {
        expect(small.points[i].u - small.base).toBeCloseTo(large.points[i].u - large.base, 9);
        expect(small.points[i].v).toBeCloseTo(large.points[i].v, 9);
      }
      expect(small.tipBehind).toBe(large.tipBehind);
      expect(small.depth).toBe(large.depth);
      expect(highest(small)).toBeCloseTo(highest(large), 9);
      // The leading edge is what moved: relative to the trailing edge its points differ.
      const moved = small.points
        .slice(1, small.tipFrom)
        .some((p, i) => Math.abs(p.u - small.base - (large.points[i + 1].u - large.base)) > 1);
      expect(moved).toBe(true);
    });
  }
});
