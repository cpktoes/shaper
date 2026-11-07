import { describe, expect, it } from "vitest";
import { finMeasures, phase16FinCases, type Phase16FinCase } from "./__fixtures__/phase16-fin-cases";
import {
  FIN_CUBIC_SAMPLES,
  FIN_QUAD_REAR_OF_FRONT,
  FIN_ROLE_DEPTH_IN,
  FIN_ROLE_TEMPLATE,
  FIN_SINGLE_BASE_OF_DEPTH,
  FIN_TEMPLATES,
  FIN_THICKNESS_IN,
  FIN_TWO_PLUS_ONE_SHORTER_IN,
  finOutline,
  finOutlineRole,
  finRoleDepth,
  finTemplateFootprint,
  placedFins,
  singleFinDepth,
  type FinOutline,
  type FinOutlineRole,
  type FinTemplateCubic,
  type FinTemplateName,
  type PlacedFin,
} from "./fin-outline";
import type { FinMark, FinSetup, TwinTemplate } from "./fins";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm, mmToFeet, type Mm } from "./units";

/**
 * The 3D board's fins (Phase 16, D-21, D-22, D-25, as D-35 and D-36 amend them). Every expected value is worked out here
 * from FINS' own marks, the templates and the role's figures. Typed only: the research's five fills and three sweeps
 * (16-17-RESEARCH.md), each beside its section and its tolerance, because they are design figures.
 */

const TOL = 1e-9;

const CASES = phase16FinCases();
const caseOf = (label: string): Phase16FinCase => {
  const found = CASES.find((c) => c.label === label);
  if (!found) throw new Error(`no case ${label}`);
  return found;
};
const placedIn = ({ preset, spec, marks, rockerAt }: Phase16FinCase): PlacedFin[] =>
  placedFins(marks, spec.finSetup, spec.twinTemplate, preset.outline.length, rockerAt);

const TEMPLATE_NAMES = Object.keys(FIN_TEMPLATES) as FinTemplateName[];
const ROLES = Object.keys(FIN_ROLE_TEMPLATE) as FinOutlineRole[];

/** The highest point of a template, and the rearmost, in its own fractions: where its tip cubic starts and ends. */
const highestOf = (name: FinTemplateName) => FIN_TEMPLATES[name][0][3];
const rearmostOf = (name: FinTemplateName) => FIN_TEMPLATES[name][1][3];

function cubicFraction(c: FinTemplateCubic, t: number): readonly [number, number] {
  const s = 1 - t;
  const w = [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
  return [w.reduce((sum, k, i) => sum + k * c[i][0], 0), w.reduce((sum, k, i) => sum + k * c[i][1], 0)];
}

/** A template's area over root × depth: its outline finely sampled and closed along the root. */
function templateFill(name: FinTemplateName): number {
  const samples = 4001;
  const pts: (readonly [number, number])[] = [];
  for (const cubic of FIN_TEMPLATES[name]) {
    for (let i = 0; i < samples; i++) pts.push(cubicFraction(cubic, i / (samples - 1)));
  }
  let twice = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    twice += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(twice) / 2;
}

/** Whether any two edges of the closed outline cross. */
function selfCrosses(outline: FinOutline): boolean {
  const pts = [...outline.points, outline.points[0]];
  type P = (typeof pts)[0];
  const cross = (a: P, b: P, c: P, d: P) => {
    const o1 = (b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u);
    const o2 = (b.u - a.u) * (d.v - a.v) - (b.v - a.v) * (d.u - a.u);
    const o3 = (d.u - c.u) * (a.v - c.v) - (d.v - c.v) * (a.u - c.u);
    const o4 = (d.u - c.u) * (b.v - c.v) - (d.v - c.v) * (b.u - c.u);
    return o1 * o2 < 0 && o3 * o4 < 0;
  };
  for (let i = 0; i + 1 < pts.length; i++) {
    for (let j = i + 2; j + 1 < pts.length; j++) {
      if (i === 0 && j === pts.length - 2) continue;
      if (cross(pts[i], pts[i + 1], pts[j], pts[j + 1])) return true;
    }
  }
  return false;
}

describe("the five shapes (D-35, 16-17-RESEARCH.md §1, §2, §3, §5, §6)", () => {
  for (const name of TEMPLATE_NAMES) {
    it(`${name}: joined end to end, from the root's front to the root's end, level at the top and upright at the back`, () => {
      const cubics = FIN_TEMPLATES[name];
      expect(cubics[0][0]).toEqual([0, 0]);
      if (name !== "keel") expect(cubics.at(-1)?.[3]).toEqual([1, 0]);
      cubics.forEach((cubic, i) => {
        if (i > 0) expect(cubic[0]).toEqual(cubics[i - 1][3]);
        for (const [, y] of cubic) {
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(1);
        }
      });
      const [leading, tip, trailing] = cubics;
      expect(leading[2][1]).toBe(1);
      expect(leading[3][1]).toBe(1);
      expect(tip[0][1]).toBe(1);
      expect(tip[1][1]).toBe(1);
      expect(tip[2][0]).toBe(tip[3][0]);
      expect(trailing[0][0]).toBe(tip[3][0]);
      expect(trailing[1][0]).toBe(tip[3][0]);
    });
  }

  it("only the keel has a fourth cubic, its cut-away, from the heel forward to the root's end", () => {
    for (const name of TEMPLATE_NAMES) expect(FIN_TEMPLATES[name]).toHaveLength(name === "keel" ? 4 : 3);
    const [, , trailing, cutAway] = FIN_TEMPLATES.keel;
    expect(trailing[3][1]).toBeGreaterThan(0);
    expect(cutAway[3]).toEqual([1, 0]);
    for (const [x, y] of cutAway) {
      expect(x).toBeGreaterThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
    }
  });

  // The fills §1, §2, §3, §5 and §6 measured, held to 0.003.
  const FILLS: Record<FinTemplateName, number> = { side: 0.76, twin: 0.758, keel: 1.046, small: 0.779, single: 0.636 };
  for (const name of TEMPLATE_NAMES) {
    it(`${name}'s fill is the research's`, () => {
      expect(Math.abs(templateFill(name) - FILLS[name])).toBeLessThanOrEqual(0.003);
    });
  }
});

describe("finTemplateFootprint", () => {
  it("is one root for four shapes, and the keel's heel for the keel", () => {
    for (const name of TEMPLATE_NAMES.filter((n) => n !== "keel")) expect(finTemplateFootprint(name)).toBe(1);
    expect(finTemplateFootprint("keel")).toBe(FIN_TEMPLATES.keel[3][0][0]);
  });
});

describe("Rule A: the whole fin stretches along the board, and its depth stays (D-36)", () => {
  for (const role of ROLES) {
    it(role, () => {
      const depth = finRoleDepth(role, inchesToMm(108));
      const small = finOutline(role, inchesToMm(3.5), depth);
      const large = finOutline(role, inchesToMm(6.25), depth);
      expect(small.points).toHaveLength(large.points.length);
      expect(small.tipFrom).toBe(large.tipFrom);
      small.points.forEach((p, i) => {
        expect(large.points[i].v).toBe(p.v);
        expect(Math.abs(large.points[i].u - (p.u * 6.25) / 3.5)).toBeLessThan(TOL);
      });
      expect(small.depth).toBe(large.depth);
      expect(small.points[small.tipFrom].v).toBe(large.points[large.tipFrom].v);
    });
  }
});

describe("every role's depth (D-22, D-25, D-35, D-36)", () => {
  for (const p of BOARD_PRESETS) {
    const L = p.outline.length;
    it(p.name, () => {
      expect(finRoleDepth("single", L)).toBe(singleFinDepth(L));
      expect(finRoleDepth("twoPlusOneCentre", L)).toBe(inchesToMm(mmToFeet(L) - FIN_TWO_PLUS_ONE_SHORTER_IN));
      expect(finRoleDepth("thruster", L)).toBe(inchesToMm(FIN_ROLE_DEPTH_IN.thruster));
      expect(finRoleDepth("quadRear", L)).toBe(FIN_QUAD_REAR_OF_FRONT * finRoleDepth("thruster", L));
      expect(finRoleDepth("trailer", L)).toBe(FIN_QUAD_REAR_OF_FRONT * finRoleDepth("thruster", L));
      expect(finRoleDepth("twinUpright", L)).toBe(inchesToMm(FIN_ROLE_DEPTH_IN.twinUpright));
      expect(finRoleDepth("twinKeel", L)).toBe(inchesToMm(FIN_ROLE_DEPTH_IN.twinKeel));
      expect(finRoleDepth("sideBite", L)).toBe(inchesToMm(FIN_ROLE_DEPTH_IN.sideBite));
    });
  }

  it("the figures are the founder's and D-25's: 25% shorter, an inch shorter, 5, 4.5 and 3.5", () => {
    expect(FIN_QUAD_REAR_OF_FRONT).toBe(0.75);
    expect(FIN_TWO_PLUS_ONE_SHORTER_IN).toBe(1);
    expect(FIN_ROLE_DEPTH_IN).toEqual({ twinUpright: 5, twinKeel: 5, thruster: 4.5, sideBite: 3.5 });
  });

  it("a 9'0\" board's single is 9\" deep and a 7'6\" board's 7.5\"", () => {
    expect(singleFinDepth(inchesToMm(108))).toBeCloseTo(inchesToMm(9), 9);
    expect(singleFinDepth(inchesToMm(90))).toBeCloseTo(inchesToMm(7.5), 9);
  });
});

/** What D-35 and D-36 say each mark should draw as, worked out from the setup and the mark's role alone. */
function expectedRole(setup: FinSetup, twin: TwinTemplate, mark: FinMark): FinOutlineRole {
  if (setup === "single") return "single";
  if (setup === "2plus1") return mark.role === "center" ? "twoPlusOneCentre" : "sideBite";
  if (setup === "twin") {
    if (mark.role === "center") return "trailer";
    return twin === "keel" ? "twinKeel" : "twinUpright";
  }
  if (setup === "quad") return mark.role === "rear" ? "quadRear" : "thruster";
  return "thruster";
}

/** The rule's base and FINS line for one placed fin. */
function expectFinTrueToFins(fin: PlacedFin, mark: FinMark, role: FinOutlineRole, length: Mm, rockerAt: (s: Mm) => Mm) {
  expect(fin.role).toBe(role);
  expect(fin.outline.depth).toBe(finRoleDepth(role, length));
  const big = role === "single" || role === "twoPlusOneCentre";
  expect(fin.thickness).toBe(inchesToMm(big ? FIN_THICKNESS_IN.single : FIN_THICKNESS_IN.side));
  if (big) {
    const base = FIN_SINGLE_BASE_OF_DEPTH * fin.outline.depth;
    expect(Math.abs(fin.outline.base - base)).toBeLessThan(TOL);
    // Centred in FINS' box: never the box's own length.
    expect(fin.outline.base).toBeLessThan(mark.baseLength);
    const boxCentre = mark.offTail + mark.baseLength / 2;
    expect(Math.abs((fin.leading[0] + fin.trailing[0]) / 2 - boxCentre)).toBeLessThan(TOL);
    expect(fin.trailing[1]).toBe(0);
    expect(fin.leading[1]).toBe(0);
  } else if (role === "twinKeel") {
    expectKeelOnDots(fin, mark);
  } else {
    expect(fin.outline.base).toBe(mark.baseLength);
    expect(fin.trailing[0]).toBe(mark.offTail);
    expect(fin.trailing[1]).toBe(mark.lateral);
    expect(fin.leading[0]).toBe(mark.leadingOffTail);
    expect(fin.leading[1]).toBe(mark.leadingLateral);
  }
  const centre = (fin.leading[0] + fin.trailing[0]) / 2;
  expect(fin.rootZ).toBe(rockerAt(mm(centre)));
  expect(fin.leading[2]).toBe(fin.rootZ);
  expect(fin.trailing[2]).toBe(fin.rootZ);
  const slope = (rockerAt(mm(centre + 1)) - rockerAt(mm(centre - 1))) / 2;
  expect(fin.tiltRad).toBe(Math.atan(slope));
}

/** Within 0.05 mm of each FINS dot, a keel's leading root and its heel, on the FINS line. */
function expectKeelOnDots(fin: PlacedFin, mark: FinMark) {
  const heelAt = finTemplateFootprint("keel");
  expect(Math.abs(fin.outline.footprint - mark.baseLength)).toBeLessThan(TOL);
  expect(Math.abs(fin.outline.base - mark.baseLength / heelAt)).toBeLessThan(TOL);
  const unit = {
    x: (fin.trailing[0] - fin.leading[0]) / fin.outline.base,
    y: (fin.trailing[1] - fin.leading[1]) / fin.outline.base,
  };
  expect(Math.abs(Math.hypot(unit.x, unit.y) - 1)).toBeLessThan(TOL);
  const heel = { x: fin.leading[0] + unit.x * fin.outline.footprint, y: fin.leading[1] + unit.y * fin.outline.footprint };
  expect(Math.hypot(fin.leading[0] - mark.leadingOffTail, fin.leading[1] - mark.leadingLateral)).toBeLessThan(0.05);
  expect(Math.hypot(heel.x - mark.offTail, heel.y - mark.lateral)).toBeLessThan(0.05);
  // Along the FINS line, toe included.
  const line = { x: mark.offTail - mark.leadingOffTail, y: mark.lateral - mark.leadingLateral };
  expect(Math.abs(unit.x * line.y - unit.y * line.x)).toBeLessThan(TOL);
}

describe("every fin of every case", () => {
  for (const c of CASES) {
    it(c.label, () => {
      const { preset, spec, marks, rockerAt } = c;
      const fins = placedIn(c);
      expect(fins).toHaveLength(marks.length);
      fins.forEach((fin, i) => {
        const role = expectedRole(spec.finSetup, spec.twinTemplate, marks[i]);
        expect(finOutlineRole(spec.finSetup, spec.twinTemplate, marks[i])).toBe(role);
        expectFinTrueToFins(fin, marks[i], role, preset.outline.length, rockerAt);

        const { outline } = fin;
        const { base, depth, points, tipFrom, template } = outline;
        expect(template).toBe(FIN_ROLE_TEMPLATE[role]);
        const cubics = FIN_TEMPLATES[template];
        expect(points).toHaveLength(1 + (FIN_CUBIC_SAMPLES - 1) * cubics.length);
        expect(points[0]).toEqual({ u: 0, v: 0 });
        expect(points.at(-1)).toEqual({ u: base, v: 0 });
        for (const p of points.slice(1, -1)) expect(p.v).toBeGreaterThan(0);
        expect(selfCrosses(outline)).toBe(false);

        const [s] = highestOf(template);
        expect(points[tipFrom]).toEqual({ u: s * base, v: depth });
        expect(points.filter((p) => p.v >= depth)).toHaveLength(1);
        expect(outline.tipBehind).toBe((s - 1) * base);

        const [m, h] = rearmostOf(template);
        const measures = finMeasures(outline);
        expect(measures.rearmost).toEqual({ u: m * base, v: h * depth });
        expect(Math.max(...points.map((p) => p.u))).toBe(m * base);

        const fillArea = templateFill(template) * base * depth;
        expect(Math.abs(measures.area - fillArea) / fillArea).toBeLessThanOrEqual(0.005);
        const sweep = (Math.atan(((s - 0.5) * base) / depth) * 180) / Math.PI;
        expect(Math.abs(measures.sweepDeg - sweep)).toBeLessThan(TOL);
      });
    });
  }
});

describe("the research's sweeps (16-17-RESEARCH.md §11, each to 0.2°)", () => {
  const sweepOf = (label: string, role: FinOutlineRole) => {
    const fin = placedIn(caseOf(label)).find((f) => f.role === role);
    if (!fin) throw new Error(`${label} has no ${role}`);
    return finMeasures(fin.outline).sweepDeg;
  };

  it("the Shortboard's thruster, 35.4°", () => {
    expect(Math.abs(sweepOf("shortboard|opened", "thruster") - 35.4)).toBeLessThanOrEqual(0.2);
  });
  it("the Longboard's single, 32.2°", () => {
    expect(Math.abs(sweepOf("longboard|opened", "single") - 32.2)).toBeLessThanOrEqual(0.2);
  });
  it("the Mid-length's quad rears, 35.9°", () => {
    expect(Math.abs(sweepOf("midlength|opened", "quadRear") - 35.9)).toBeLessThanOrEqual(0.2);
  });
});

/** The Fish switched to a keel twin with FINS' base set to `baseIn`. */
function keelAt(baseIn: number, c: Phase16FinCase = caseOf("fish|twin/keel")) {
  const marks = c.marks.map((m) => ({
    ...m,
    baseLength: inchesToMm(baseIn),
    leadingOffTail: mm(m.offTail + inchesToMm(baseIn)),
  }));
  const fins = placedFins(marks, "twin", "keel", c.preset.outline.length, c.rockerAt);
  return { marks, fins, rockerAt: c.rockerAt };
}

describe("the keel's footprint on FINS' dots (D-36: \"a 6\" base = 6\" base fin\")", () => {
  for (const baseIn of [4.5, 6.5]) {
    it(`at ${baseIn}": the whole footprint is FINS' base, leading edge to heel, and the depth stays`, () => {
      const { marks, fins } = keelAt(baseIn);
      expect(fins).toHaveLength(marks.length);
      fins.forEach((fin, i) => {
        expect(fin.role).toBe("twinKeel");
        expect(fin.outline.depth).toBe(inchesToMm(FIN_ROLE_DEPTH_IN.twinKeel));
        expectKeelOnDots(fin, marks[i]);
      });
    });

    it(`at ${baseIn}": the cut-away lies behind the root's end and above its line`, () => {
      const [fin] = keelAt(baseIn).fins;
      const { points, base } = fin.outline;
      const cutAway = points.slice(3 * (FIN_CUBIC_SAMPLES - 1), -1);
      expect(cutAway).toHaveLength(FIN_CUBIC_SAMPLES - 1);
      expect(cutAway[0].u).toBeCloseTo(finTemplateFootprint("keel") * base, 9);
      for (const p of cutAway) {
        expect(p.u).toBeGreaterThan(base);
        expect(p.v).toBeGreaterThan(0);
      }
    });

    it(`at ${baseIn}": nothing behind the root lies in the foam, on all four presets' rockers`, () => {
      for (const p of BOARD_PRESETS) {
        const { fins, rockerAt } = keelAt(baseIn, caseOf(`${p.id}|twin/keel`));
        for (const fin of fins) {
          // The fin's own axes in the board's, as the scene stands it: u toward the tail along the bottom, v square off
          // it, from the root's front, half a root back from the root's middle.
          const slope = Math.tan(fin.tiltRad);
          const run = Math.hypot(fin.trailing[0] - fin.leading[0], fin.trailing[1] - fin.leading[1]);
          const along = (fin.trailing[0] - fin.leading[0]) / run;
          const uLength = Math.hypot(along, (fin.trailing[1] - fin.leading[1]) / run, slope * along);
          const u = { x: along / uLength, z: (slope * along) / uLength };
          const v = { x: slope / Math.hypot(slope, 1), z: -1 / Math.hypot(slope, 1) };
          const origin = {
            x: (fin.leading[0] + fin.trailing[0]) / 2 - (u.x * fin.outline.base) / 2,
            z: fin.rootZ - (u.z * fin.outline.base) / 2,
          };
          for (const q of fin.outline.points.filter((point) => point.u > fin.outline.base)) {
            const x = origin.x + q.u * u.x + q.v * v.x;
            const z = origin.z + q.u * u.z + q.v * v.z;
            expect(z).toBeLessThan(rockerAt(mm(x)));
          }
        }
      }
    });
  }

  it("a longer FINS base gives a longer root, one for one over the heel's place, at the same depth", () => {
    const [short] = keelAt(4.5).fins;
    const [long] = keelAt(6.5).fins;
    const grew = (inchesToMm(6.5) - inchesToMm(4.5)) / finTemplateFootprint("keel");
    expect(Math.abs(long.outline.base - short.outline.base - grew)).toBeLessThan(TOL);
    expect(long.outline.depth).toBe(short.outline.depth);
  });

  it("the sweep follows from the template on the root the footprint gives", () => {
    for (const baseIn of [4.5, 6.5]) {
      const [fin] = keelAt(baseIn).fins;
      const root = inchesToMm(baseIn) / finTemplateFootprint("keel");
      const [s] = highestOf("keel");
      const sweep = (Math.atan(((s - 0.5) * root) / inchesToMm(FIN_ROLE_DEPTH_IN.twinKeel)) * 180) / Math.PI;
      expect(Math.abs(finMeasures(fin.outline).sweepDeg - sweep)).toBeLessThan(TOL);
    }
  });
});

describe("the setups, by the founder's rules", () => {
  it("draws a quad's rears 25% shallower than its fronts, on FINS' own rear base, and its centre fin as a side fin", () => {
    const c = caseOf("midlength|opened");
    expect(c.spec.finSetup).toBe("quad");
    const fins = placedIn(c);
    const rear = fins.find((f) => f.role === "quadRear");
    const frontAt = c.marks.findIndex((m) => m.role === "front");
    if (!rear) throw new Error("no rear fin");
    expect(rear.outline.depth).toBe(FIN_QUAD_REAR_OF_FRONT * fins[frontAt].outline.depth);
    expect(rear.outline.template).toBe("small");
    expect(fins[frontAt].outline.template).toBe("side");
    expect(fins[c.marks.findIndex((m) => m.role === "center")].role).toBe("thruster");
  });

  it("draws an Upright + Trailer's mains as upright twins and its centre as the small fin, 25% shallower than a side fin", () => {
    const c = caseOf("fish|twin/trailer");
    const fins = placedIn(c);
    expect(c.marks.some((m) => m.role === "center")).toBe(true);
    fins.forEach((fin, i) => {
      expect(fin.role).toBe(c.marks[i].role === "center" ? "trailer" : "twinUpright");
      expect(fin.outline.base).toBe(c.marks[i].baseLength);
    });
  });

  it("draws a 2+1's centre an inch shallower than a single on the same board, in its box, and small side bites", () => {
    const fins = placedIn(caseOf("midlength|2plus1"));
    const centre = fins.find((f) => f.role === "twoPlusOneCentre");
    const single = placedIn(caseOf("midlength|single"))[0];
    if (!centre) throw new Error("no centre");
    expect(Math.abs(centre.outline.depth - (single.outline.depth - inchesToMm(1)))).toBeLessThan(TOL);
    const bites = fins.filter((f) => f.role === "sideBite");
    expect(bites).toHaveLength(2);
    for (const bite of bites) expect(bite.outline.template).toBe("small");
  });
});

describe("placedFins leaves out a fin whose figures are not usable numbers, and keeps the rest (T-16-22)", () => {
  const { preset, marks, rockerAt, spec } = caseOf("shortboard|opened");

  it("a bad base or position", () => {
    const broken = marks.map((m, i) => (i === 0 ? { ...m, baseLength: mm(Number.NaN) } : m));
    const zero = marks.map((m, i) => (i === 1 ? { ...m, baseLength: mm(0) } : m));
    const nowhere = marks.map((m, i) => (i === 2 ? { ...m, offTail: mm(Number.POSITIVE_INFINITY) } : m));
    for (const set of [broken, zero, nowhere]) {
      expect(placedFins(set, spec.finSetup, spec.twinTemplate, preset.outline.length, rockerAt)).toHaveLength(marks.length - 1);
    }
  });

  it("a keel with a bad base, or with its two dots in one place", () => {
    const keel = caseOf("fish|twin/keel");
    const at = (set: FinMark[]) => placedFins(set, "twin", "keel", keel.preset.outline.length, keel.rockerAt);
    expect(at(keel.marks.map((m, i) => (i === 0 ? { ...m, baseLength: mm(Number.NaN) } : m)))).toHaveLength(1);
    expect(
      at(keel.marks.map((m, i) => (i === 0 ? { ...m, leadingOffTail: m.offTail, leadingLateral: m.lateral } : m))),
    ).toHaveLength(1);
  });

  it("a depth that is not a number", () => {
    const single = caseOf("longboard|opened");
    expect(placedFins(single.marks, "single", "upright", mm(Number.NaN), single.rockerAt)).toHaveLength(0);
  });
});
