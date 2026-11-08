import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import golden from "./__fixtures__/bottom-golden.json";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_FLOOR,
  BOTTOM_SECTIONS,
  bottomHasCut,
  bottomLitresLine,
  bottomSampler,
  cutFoamOff,
  cutHalfWidth,
  cutKind,
  DEFAULT_BOTTOM,
  fadeAt,
  foamOff,
  isDefaultBottom,
  keepStationsInOrder,
  PINCH,
  resolveBottom,
  resolveCut,
  rise,
  sec,
  smoothstep,
  startingCut,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomCutSpec,
  type BottomSectionKey,
  type ResolvedBottom,
  type ResolvedCut,
} from "./bottom";
import type { DesignSummaryFields } from "./design";
import { designBottomBoard, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES } from "./design";
import { frontFinStation } from "./fins";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, litres, mm, type Mm } from "./units";

/*
 * Every expected figure here is the founder's sketch 021's own, executed on the app's five boards by
 * scripts/extract-sketch021-bottom-golden.mjs into bottom-golden.json (CLAUDE.md Rule 1) — or the app's own functions,
 * as a relation. No litres or foam-off figure is typed.
 */

const TOL = 1e-9;

/** The five boards the golden was taken on, built the way its script builds them — from the app. */
function boardFields(): { id: string; fields: DesignSummaryFields }[] {
  const all = phase16Boards();
  const presets = BOARD_PRESETS.map((preset) => {
    const label = `${preset.id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`;
    const found = all.find((b) => b.label === label);
    if (!found) throw new Error(`no ${label}`);
    return { id: preset.id, fields: found.fields };
  });
  const fish = presets.find((p) => p.id === "fish")!;
  const wing = {
    station: mm(frontFinStation(designFinPlacement(fish.fields)) + inchesToMm(4)),
    depth: inchesToMm(1 / 4),
    run: inchesToMm(1),
    radius: mm(0),
    lock: null,
    finOffset: mm(0),
  };
  return [...presets, { id: "fishwing", fields: { ...fish.fields, outline: { ...fish.fields.outline, wings: [wing] } } }];
}

function bottomBoardOf(fields: DesignSummaryFields): BottomBoard {
  return designBottomBoard(
    fields.outline,
    buildOutline(fields.outline),
    designSideProfile(fields, LIVE_DESIGN_RULES),
    designFinPlacement(fields),
  );
}

const FIELDS = boardFields();
const BOARDS = FIELDS.map(({ id, fields }) => ({ id, board: bottomBoardOf(fields) }));
const boardById = (id: string) => BOARDS.find((b) => b.id === id)!.board;

type GoldenCut = { name: string; kind: string; off: number; offS: number; trough: number; start: number; deep: number; end: number; depth: number; smooth: number; vee: number; pointed: boolean; spiral: boolean };
type CutCase = { kind: "cut"; board: string; section: BottomSectionKey; name: string; cut: GoldenCut; cutOff: number[][]; foamOff: number[][]; litresOff: number };
type NormalizeCase = { kind: "normalize"; board: string; section: BottomSectionKey; name: string; changed: "start" | "deep" | "end"; to: number; after: { start: number; deep: number; end: number; offS: number; trough: number } };

const cases = golden.cases as unknown as { kind: string }[];
const thisWave = (name: string) => BOTTOM_SECTIONS.some((s) => (BOTTOM_CUT_NAMES[s] as readonly string[]).includes(name));
const cutCases = (cases.filter((c) => c.kind === "cut") as CutCase[]).filter((c) => thisWave(c.name));
const normalizeCases = (cases.filter((c) => c.kind === "normalize") as NormalizeCase[]).filter((c) => thisWave(c.name));

/** The golden's `makeCut` numbers, in the app's words. */
function expectSketchCut(r: ResolvedCut, g: GoldenCut) {
  expect(r.name).toBe(g.name);
  expect(r.kind).toBe(g.kind);
  expect(r.spiral).toBe(g.spiral);
  expect(r.closesToPoint).toBe(g.pointed);
  expect(r.smoothness).toBe(g.smooth);
  for (const [app, sketch] of [
    [r.offRail, g.off],
    [r.offStringer, g.offS],
    [r.troughAt, g.trough],
    [r.start, g.start],
    [r.deepest, g.deep],
    [r.end, g.end],
    [r.depth, g.depth],
    [r.veeLift, g.vee],
  ] as const) {
    expect(Math.abs(app - sketch)).toBeLessThan(TOL);
  }
}

describe("the names (D-04)", () => {
  it("lists this wave's thirteen names, in D-04's order, each a flat, a belly, a vee or a single", () => {
    expect(BOTTOM_CUT_NAMES.nose.length + BOTTOM_CUT_NAMES.center.length + BOTTOM_CUT_NAMES.tail.length).toBe(13);
    for (const section of BOTTOM_SECTIONS) {
      // the sketch's own order, less the names 17-04 inserts
      const sketchOrder = [...new Set(cutCases.filter((c) => c.section === section).map((c) => c.name))];
      expect([...BOTTOM_CUT_NAMES[section]]).toEqual(sketchOrder);
      for (const name of BOTTOM_CUT_NAMES[section]) {
        const g = cutCases.find((c) => c.name === name)!;
        expect(cutKind(name)).toBe(g.cut.kind);
      }
    }
  });
});

describe("starting numbers (D-08): the sketch's makeCut, on each of the five boards", () => {
  it("covers 13 names on 5 boards", () => {
    expect(cutCases.length).toBe(13 * 5);
  });
  it.each(cutCases.map((c) => [c.board, c.section, c.name, c] as const))("%s · %s · %s", (_b, section, name, c) => {
    const board = boardById(c.board);
    const stored = startingCut(section, name as BottomCutName, board);
    expectSketchCut(resolveCut(section, stored, board), c.cut);
  });
  it("a flat's numbers are all 0, stored and read", () => {
    for (const { board } of BOARDS) {
      for (const section of BOTTOM_SECTIONS) {
        const name = BOTTOM_CUT_NAMES[section][0];
        expect(cutKind(name)).toBe("flat");
        const stored = startingCut(section, name, board);
        const r = resolveCut(section, stored, board);
        for (const v of [stored.start, stored.deepest, stored.end, stored.depth, r.start, r.deepest, r.end, r.depth, r.offRail]) expect(v).toBe(0);
      }
    }
  });
  it("every starting cut reads Start ≥ Deepest ≥ End, on the board", () => {
    for (const { board } of BOARDS) {
      for (const section of BOTTOM_SECTIONS) {
        for (const name of BOTTOM_CUT_NAMES[section]) {
          const r = resolveCut(section, startingCut(section, name, board), board);
          expect(r.start).toBeGreaterThanOrEqual(r.deepest);
          expect(r.deepest).toBeGreaterThanOrEqual(r.end);
          expect(r.end).toBeGreaterThanOrEqual(0);
          expect(r.start).toBeLessThanOrEqual(board.length);
        }
      }
    }
  });
});

describe("stations kept from the nearest tip (D-39) and the tail's deepest from the fins (D-03)", () => {
  const shortboard = FIELDS.find((f) => f.id === "shortboard")!.fields;
  const longer = bottomBoardOf({ ...shortboard, outline: { ...shortboard.outline, length: mm(shortboard.outline.length + inchesToMm(6)) } });
  const board = boardById("shortboard");

  it.each(BOTTOM_CUT_NAMES.nose.filter((n) => cutKind(n) !== "flat"))("a %s on a board 6\" longer sits 6\" further from the tail", (name) => {
    const stored = startingCut("nose", name, board);
    expect(stored.start).toBeGreaterThanOrEqual(0);
    const a = resolveCut("nose", stored, board);
    const b = resolveCut("nose", stored, longer);
    for (const key of ["start", "deepest", "end"] as const) {
      expect(Math.abs(b[key] - a[key] - inchesToMm(6))).toBeLessThan(TOL);
      // and the same distance from the nose
      expect(Math.abs(longer.length - b[key] - (board.length - a[key]))).toBeLessThan(TOL);
    }
  });

  it("a Center cut is stored from the tail, as is", () => {
    const stored = startingCut("center", "Deep Single Concave", board);
    const r = resolveCut("center", stored, longer);
    expect(r.start).toBe(stored.start);
    expect(r.deepest).toBe(stored.deepest);
    expect(r.end).toBe(stored.end);
  });

  it("a Tail cut's Deepest At is stored from the front fins and rides with them", () => {
    for (const { board: b } of BOARDS) {
      for (const name of BOTTOM_CUT_NAMES.tail.filter((n) => cutKind(n) !== "flat")) {
        const stored = startingCut("tail", name, b);
        const r = resolveCut("tail", stored, b);
        expect(Math.abs(stored.deepest - (r.deepest - b.frontFins))).toBeLessThan(TOL);
        const moved: BottomBoard = { ...b, frontFins: mm(b.frontFins + inchesToMm(2)) };
        const rm = resolveCut("tail", stored, moved);
        expect(Math.abs(rm.deepest - r.deepest - inchesToMm(2))).toBeLessThan(TOL);
        expect(rm.start).toBe(r.start);
      }
    }
  });

  it("a Center cut whose starting numbers mention the fins does not follow them", () => {
    const stored = startingCut("center", "Shallow Single Concave", board);
    const moved: BottomBoard = { ...board, frontFins: mm(board.frontFins + inchesToMm(2)) };
    expect(resolveCut("center", stored, moved)).toEqual(resolveCut("center", stored, board));
  });

  it("D-36: fins that carry a tail cut's Deepest past Start push Start to it on read, and write nothing back", () => {
    const stored = startingCut("tail", "Extending Single Concave", board);
    const before = structuredClone(stored);
    const moved: BottomBoard = { ...board, frontFins: mm(board.frontFins + inchesToMm(14)) };
    const r = resolveCut("tail", stored, moved);
    expect(r.start).toBe(r.deepest);
    expect(r.deepest).toBeGreaterThan(stored.start);
    expect(stored).toEqual(before);
  });

  it("D-36: fins that carry it below End push End to it", () => {
    const stored = startingCut("tail", "Extending Single Concave", board);
    const before = structuredClone(stored);
    const moved: BottomBoard = { ...board, frontFins: mm(inchesToMm(1)) };
    const r = resolveCut("tail", stored, moved);
    expect(r.end).toBe(r.deepest);
    expect(r.deepest).toBeLessThan(stored.end);
    expect(stored).toEqual(before);
  });

  it("every station is clamped to the board", () => {
    const stored: BottomCutSpec = { ...startingCut("center", "Deep Single Concave", board), start: mm(board.length * 2), end: mm(-50) };
    const r = resolveCut("center", stored, board);
    expect(r.start).toBe(board.length);
    expect(r.end).toBe(0);
  });

  it("resolveBottom reads the three sections and passes the channels and the wing rule through", () => {
    const bottom: BoardBottom = { ...DEFAULT_BOTTOM, center: startingCut("center", "Deep Single Concave", board) };
    const r = resolveBottom(bottom, board);
    expect(r.center).toEqual(resolveCut("center", bottom.center, board));
    expect(r.nose).toEqual(resolveCut("nose", bottom.nose, board));
    expect(r.tail).toEqual(resolveCut("tail", bottom.tail, board));
    expect(r.channels).toBe(bottom.channels);
    expect(r.wingRule).toBe("narrowest");
  });
});

describe("keepStationsInOrder (D-07): the sketch's normalize", () => {
  it("covers every station drag of this wave's non-flat names", () => {
    expect(normalizeCases.length).toBe(10 * 3 * 3 * 5);
  });
  it.each(normalizeCases.map((c) => [c.board, c.section, c.name, c.changed, c.to, c] as const))(
    "%s · %s · %s · %s to %d",
    (_b, section, name, changed, to, c) => {
      const board = boardById(c.board);
      const stored = startingCut(section, name as BottomCutName, board);
      const field = changed === "deep" ? "deepest" : changed;
      // the drag, written the way it is stored: from the nose, from the tail, or the tail's deepest from the fins
      const storedTo = section === "nose" ? board.length - to : section === "tail" && field === "deepest" ? to - board.frontFins : to;
      const dragged = { ...stored, [field]: mm(storedTo) };
      const kept = keepStationsInOrder(section, dragged, field, board);
      const r = resolveCut(section, kept, board);
      expect(Math.abs(r.start - c.after.start)).toBeLessThan(TOL);
      expect(Math.abs(r.deepest - c.after.deep)).toBeLessThan(TOL);
      expect(Math.abs(r.end - c.after.end)).toBeLessThan(TOL);
      expect(Math.abs(r.offStringer - c.after.offS)).toBeLessThan(TOL);
      expect(Math.abs(r.troughAt - c.after.trough)).toBeLessThan(TOL);
      // the dragged station is never stopped
      expect(Math.abs(r[field] - to)).toBeLessThan(TOL);
    },
  );
});

describe("DEFAULT_BOTTOM (D-04, D-11)", () => {
  it("is three flats and no channels, and cuts nothing", () => {
    for (const section of BOTTOM_SECTIONS) expect(cutKind(DEFAULT_BOTTOM[section].name)).toBe("flat");
    expect(DEFAULT_BOTTOM.channels.count).toBe(0);
    expect(DEFAULT_BOTTOM.wingRule).toBe("narrowest");
    expect(bottomHasCut(DEFAULT_BOTTOM)).toBe(false);
  });
  it("keeps D-11's channel numbers for when a count is picked", () => {
    const ch = DEFAULT_BOTTOM.channels;
    expect(ch.depth).toBe(inchesToMm(5 / 16));
    expect(ch.startFromFins).toBe(inchesToMm(12));
    expect(ch.deepestFromFins).toBe(0);
    expect(ch.end).toBe(0);
    expect(ch.offStringer).toBe(0);
    expect(ch.smoothness).toBe(0);
    expect(ch.run).toBe("parallel");
    expect(ch.longest).toBe("outer");
    expect(ch.stagger).toBe(inchesToMm(2));
    expect(ch.width).toBe(inchesToMm(1.75));
  });
  it("bottomHasCut is true once a section cuts or channels are picked, false at depth 0", () => {
    const board = boardById("shortboard");
    const center = startingCut("center", "Deep Single Concave", board);
    expect(bottomHasCut({ ...DEFAULT_BOTTOM, center })).toBe(true);
    expect(bottomHasCut({ ...DEFAULT_BOTTOM, center: { ...center, depth: mm(0) } })).toBe(false);
    expect(bottomHasCut({ ...DEFAULT_BOTTOM, channels: { ...DEFAULT_BOTTOM.channels, count: 6 } })).toBe(true);
    expect(bottomHasCut({ ...DEFAULT_BOTTOM, channels: { ...DEFAULT_BOTTOM.channels, count: 6, depth: mm(0) } })).toBe(false);
  });
  it("isDefaultBottom is true of a copy and false once any one field changes", () => {
    expect(isDefaultBottom(structuredClone(DEFAULT_BOTTOM))).toBe(true);
    const variants: BoardBottom[] = [];
    for (const section of BOTTOM_SECTIONS) {
      for (const key of Object.keys(DEFAULT_BOTTOM[section]) as (keyof BottomCutSpec)[]) {
        const cut = structuredClone(DEFAULT_BOTTOM[section]) as unknown as Record<string, unknown>;
        const v = cut[key];
        cut[key] = typeof v === "number" ? v + 1 : typeof v === "boolean" ? !v : "Rolled Vee";
        variants.push({ ...structuredClone(DEFAULT_BOTTOM), [section]: cut });
      }
    }
    for (const key of Object.keys(DEFAULT_BOTTOM.channels)) {
      const ch = structuredClone(DEFAULT_BOTTOM.channels) as unknown as Record<string, unknown>;
      const v = ch[key];
      ch[key] = typeof v === "number" ? (key === "count" ? 4 : v + 1) : v === "parallel" ? "rail" : "inner";
      variants.push({ ...structuredClone(DEFAULT_BOTTOM), channels: ch as unknown as BoardBottom["channels"] });
    }
    variants.push({ ...structuredClone(DEFAULT_BOTTOM), wingRule: "natural" });
    expect(variants.length).toBe(3 * 11 + 11 + 1);
    for (const v of variants) expect(isDefaultBottom(v)).toBe(false);
  });
});

describe("bottom.ts stays pure (Rule 1, Rule 2)", () => {
  const source = readFileSync(new URL("./bottom.ts", import.meta.url), "utf8");
  it("imports no React, browser, database, three or the reference copy", () => {
    const imports = (source.match(/^import[^;]+;/gm) ?? []).join("\n");
    expect(imports).toMatch(/from "\.\/units"/);
    expect(imports).not.toMatch(/react|three|@\/lib\/db|021-bottom-maths|reference/);
    expect(source).not.toMatch(/\bwindow\.|\bdocument\.|require\(/);
  });
  it("has no 25.4 of its own", () => {
    expect(source).not.toContain("25.4");
  });
});

/* ============ Task 2: the one number ============ */

type Grid = { s: number[]; y: number[][] };
type OpeningCase = { kind: "opening"; board: string; channels: number; cuts: Record<string, GoldenCut>; foamOff: number[][] };
const gridOf = (id: string) => golden.boards.find((b) => b.id === id)!.facts.grid as Grid;
const openingCases = cases.filter((c) => c.kind === "opening") as OpeningCase[];

/** A golden case's cuts as the app stores them — through `startingCut`, never by copying the sketch's numbers. */
function bottomOf(board: BottomBoard, names: Partial<Record<BottomSectionKey, string>>): BoardBottom {
  const bottom = structuredClone(DEFAULT_BOTTOM);
  for (const section of BOTTOM_SECTIONS) {
    const name = names[section];
    if (name) bottom[section] = startingCut(section, name as BottomCutName, board);
  }
  return bottom;
}

const nonFlatCutCases = cutCases.filter((c) => c.cut.kind !== "flat");
const sumOfCuts = (r: ResolvedBottom, board: BottomBoard, s: Mm, y: Mm) =>
  BOTTOM_SECTIONS.reduce((v, section) => v + cutFoamOff(r[section], board, r.wingRule, s, y), 0);
const floorCap = (board: BottomBoard, s: Mm) => Math.max(0, board.thicknessAt(s) - BOTTOM_FLOOR);

describe("cutFoamOff (D-05, D-06): one cut alone, the sketch's cutOff — golden", () => {
  it("covers the 10 non-flat names of this wave on 5 boards", () => {
    expect(nonFlatCutCases.length).toBe(10 * 5);
  });
  it.each(nonFlatCutCases.map((c) => [c.board, c.section, c.name, c] as const))("%s · %s · %s, at all 25 × 13 probes", (_b, section, name, c) => {
    const board = boardById(c.board);
    const grid = gridOf(c.board);
    const cut = resolveCut(section, startingCut(section, name as BottomCutName, board), board);
    let cutting = 0;
    grid.s.forEach((s, k) => {
      grid.y[k].forEach((y, j) => {
        const app = cutFoamOff(cut, board, "narrowest", mm(s), mm(y));
        expect(Math.abs(app - c.cutOff[k][j])).toBeLessThan(TOL);
        if (app > 0) cutting++;
      });
    });
    expect(cutting).toBeGreaterThan(0);
  });
  it("a flat takes nothing, anywhere", () => {
    for (const { id, board } of BOARDS) {
      const grid = gridOf(id);
      for (const section of BOTTOM_SECTIONS) {
        const flat = resolveCut(section, DEFAULT_BOTTOM[section], board);
        grid.s.forEach((s, k) => grid.y[k].forEach((y) => expect(cutFoamOff(flat, board, "narrowest", mm(s), mm(y))).toBe(0)));
      }
    }
  });
});

describe("foamOff (D-05, D-09): the one number — golden", () => {
  const openings = openingCases.filter((c) => c.channels === 0 && ["shortboard", "fish", "fishwing"].includes(c.board));
  it("covers the Shortboard's, the Fish's and the winged Fish's openings", () => {
    expect(openings.map((c) => c.board)).toEqual(["shortboard", "fish", "fishwing"]);
  });
  it.each(openings.map((c) => [c.board, c] as const))("%s's opening cuts equal the sketch's foamOff, and the floor does not bite", (_b, c) => {
    const board = boardById(c.board);
    const grid = gridOf(c.board);
    const resolved = resolveBottom(bottomOf(board, { nose: c.cuts.nose.name, center: c.cuts.center.name, tail: c.cuts.tail.name }), board);
    grid.s.forEach((s, k) => {
      grid.y[k].forEach((y, j) => {
        expect(sumOfCuts(resolved, board, mm(s), mm(y))).toBeLessThanOrEqual(floorCap(board, mm(s)));
        expect(Math.abs(foamOff(resolved, board, mm(s), mm(y)) - c.foamOff[k][j])).toBeLessThan(TOL);
      });
    });
  });
  it.each(nonFlatCutCases.map((c) => [c.board, c.name, c] as const))("%s · %s alone on the board: the sketch's foamOff, or the 1/4\" floor where that bites", (_b, _n, c) => {
    const board = boardById(c.board);
    const grid = gridOf(c.board);
    const resolved = resolveBottom(bottomOf(board, { [c.section]: c.name }), board);
    grid.s.forEach((s, k) => {
      grid.y[k].forEach((y, j) => {
        const expected = Math.min(c.foamOff[k][j], floorCap(board, mm(s)));
        expect(Math.abs(foamOff(resolved, board, mm(s), mm(y)) - expected)).toBeLessThan(TOL);
      });
    });
  });
});

describe("foamOff never leaves less than 1/4\" (D-09) and never goes below 0", () => {
  const thinStations = (board: BottomBoard): Mm[] => {
    const thin: Mm[] = [];
    for (let k = 0; k <= 400; k++) {
      const s = mm((board.length * k) / 400);
      if (board.thicknessAt(s) < inchesToMm(3 / 4) && board.railAt(s) > 0) thin.push(s);
    }
    return thin;
  };
  it("at least three of the five boards thin under 3/4\" at a tip", () => {
    expect(BOARDS.filter(({ board }) => thinStations(board).length > 0).length).toBeGreaterThanOrEqual(3);
  });
  it.each(BOARDS.filter(({ board }) => thinStations(board).length > 0).map((b) => [b.id, b.board] as const))("%s: every cut at 1/2\" where the foam is under 3/4\"", (_id, board) => {
    const thin = thinStations(board);
    let bit = 0;
    for (const section of BOTTOM_SECTIONS) {
      for (const name of BOTTOM_CUT_NAMES[section].filter((n) => cutKind(n) !== "flat")) {
        const bottom = structuredClone(DEFAULT_BOTTOM);
        bottom[section] = { ...startingCut(section, name, board), depth: inchesToMm(1 / 2) };
        // run the cut from tip to tip, so it reaches the thin foam at both ends at full depth
        const tipToTip = section === "nose" ? { start: mm(0), end: mm(board.length) } : { start: mm(board.length), end: mm(0) };
        bottom[section] = keepStationsInOrder(section, { ...bottom[section], ...tipToTip }, "start", board);
        bottom[section] = keepStationsInOrder(section, { ...bottom[section], ...tipToTip }, "end", board);
        const resolved = resolveBottom(bottom, board);
        for (const s of thin) {
          const W = board.railAt(s);
          for (let j = 0; j <= 12; j++) {
            const y = mm((W * j) / 12);
            const v = foamOff(resolved, board, s, y);
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(floorCap(board, s) + TOL);
            if (sumOfCuts(resolved, board, s, y) > floorCap(board, s)) bit++;
          }
        }
      }
    }
    expect(bit).toBeGreaterThan(0);
  });
});

describe("cuts stack, run past their section, shallow when narrow and run out at full depth on a tip", () => {
  const board = boardById("shortboard");

  it("a Center single whose Start lies in the nose cuts there, and a Nose belly over it adds to it", () => {
    const resolved = resolveBottom(bottomOf(board, { nose: "Rolled Belly Entry", center: "Deep Single Concave" }), board);
    expect(resolved.center.start).toBeGreaterThan(resolved.nose.end);
    let both = 0;
    for (let k = 1; k < 40; k++) {
      const s = mm(resolved.nose.end + ((resolved.center.start - resolved.nose.end) * k) / 40);
      const W = board.railAt(s);
      for (let j = 0; j <= 12; j++) {
        const y = mm((W * j) / 12);
        const belly = cutFoamOff(resolved.nose, board, "narrowest", s, y);
        const single = cutFoamOff(resolved.center, board, "narrowest", s, y);
        const sum = belly + single;
        if (sum > floorCap(board, s)) continue;
        expect(Math.abs(foamOff(resolved, board, s, y) - sum)).toBeLessThan(TOL);
        if (belly > 0 && single > 0) both++;
      }
    }
    expect(both).toBeGreaterThan(0);
  });

  it("a single narrower than 3\" is shallowed by C / PINCH; a wide one is not", () => {
    const cut = resolveCut("nose", startingCut("nose", "Blended Nose Concave", board), board);
    let narrow = 0;
    let wide = 0;
    for (let k = 0; k <= 400; k++) {
      const s = mm(cut.end + ((cut.start - cut.end) * k) / 400);
      const C = cutHalfWidth(cut, board, "narrowest", s);
      const f = fadeAt(cut.start, cut.deepest, cut.end, s, board.length);
      if (C <= 0 || f <= 0) continue;
      const atStringer = cutFoamOff(cut, board, "narrowest", s, mm(0));
      if (C < PINCH) {
        narrow++;
        expect(Math.abs(atStringer - cut.depth * f * (C / PINCH))).toBeLessThan(TOL);
        expect(atStringer).toBeLessThan(cut.depth * f);
      } else {
        wide++;
        expect(Math.abs(atStringer - cut.depth * f)).toBeLessThan(TOL);
      }
    }
    expect(narrow).toBeGreaterThan(0);
    expect(wide).toBeGreaterThan(0);
  });

  it("an End at the tail keeps full depth to the tip; an End an inch up fades", () => {
    const cut = resolveCut("tail", startingCut("tail", "Panel Vee", board), board);
    expect(cut.end).toBe(0);
    const inchUp: ResolvedCut = { ...cut, end: inchesToMm(1) };
    for (let k = 0; k < 20; k++) {
      const s = mm((cut.deepest * k) / 20);
      const W = board.railAt(s);
      expect(Math.abs(cutFoamOff(cut, board, "narrowest", s, W) - cut.depth)).toBeLessThan(TOL);
    }
    const nearEnd = mm(inchesToMm(1.5));
    expect(cutFoamOff(inchUp, board, "narrowest", nearEnd, board.railAt(nearEnd))).toBeLessThan(cut.depth);
  });

  it("the smoothstep and the two across-section curves run 0 to 1", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    for (const r of [0, 0.5, 1]) {
      expect(sec(0, r)).toBe(1);
      expect(Math.abs(sec(1, r))).toBeLessThan(TOL);
      expect(rise(0, r)).toBe(0);
      expect(Math.abs(rise(1, r) - 1)).toBeLessThan(TOL);
    }
  });

  it("nothing is cut where the board has no rail", () => {
    const resolved = resolveBottom(bottomOf(board, { nose: "Rolled Belly Entry", center: "Deep Single Concave", tail: "Panel Vee" }), board);
    const tip = board.length;
    expect(board.railAt(tip)).toBe(0);
    expect(foamOff(resolved, board, tip, mm(0))).toBe(0);
  });
});

describe("the tests type no expected figure (Rule 1, T-17-01)", () => {
  it("bottom.test.ts carries none of the sketch's litres", () => {
    const self = readFileSync(new URL("./bottom.test.ts", import.meta.url), "utf8");
    const figures = new RegExp(["0\\." + "54", "0\\." + "75", "0\\." + "31", "3\\." + "33", "0\\." + "26"].join("|"));
    expect(self).not.toMatch(figures);
  });
});

/* ============ 17-03: the one number handed to the litres, and DATA's first line ============ */

describe("bottomSampler (D-05, D-21): foamOff read from the section's own inside edge", () => {
  it("on a board with no notch it is foamOff itself, at every golden probe", () => {
    const board = boardById("shortboard");
    const resolved = resolveBottom(bottomOf(board, { center: "Deep Single Concave", tail: "Rolled Vee" }), board);
    const sample = bottomSampler(resolved, board);
    const grid = gridOf("shortboard");
    grid.s.forEach((sv, k) => {
      for (const yv of grid.y[k]) {
        expect(sample(mm(sv), mm(yv))).toBe(foamOff(resolved, board, mm(sv), mm(yv)));
      }
    });
  });

  it("inside a swallow's notch it reads the cut at its true distance from the stringer: across plus the notch wall", () => {
    const fields = phase16Boards().find((b) => b.label === "shortboard|swallow|hard")!.fields;
    const board = bottomBoardOf(fields);
    const resolved = resolveBottom(bottomOf(board, { tail: "Panel Vee" }), board);
    const sample = bottomSampler(resolved, board);
    const notchStations = Array.from({ length: 40 }, (_, k) => mm(k * 2)).filter((s) => board.notchInner(s) > 0);
    expect(notchStations.length).toBeGreaterThan(3);
    for (const s of notchStations) {
      for (const across of [0, 10, 40, 80].map(mm)) {
        expect(sample(s, across)).toBe(foamOff(resolved, board, s, mm(across + board.notchInner(s))));
      }
    }
  });
});

describe("bottomLitresLine (D-34): DATA's first line always adds up as printed", () => {
  it("prints the two litres to two decimals and the foam off as the printed before less the printed now", () => {
    const line = bottomLitresLine(litres(28.894), litres(29.613));
    expect(line.now).toBe((28.894).toFixed(2));
    expect(line.before).toBe((29.613).toFixed(2));
    const hundredths = (printed: string) => Math.round(Number(printed) * 100);
    expect(hundredths(line.foamOff)).toBe(hundredths(line.before) - hundredths(line.now));
    expect(line.foamOff).toMatch(/^\d+\.\d\d$/);
  });

  it("adds up as printed on every board's litres with every cut of this wave, however the two figures round", () => {
    for (const { id } of BOARDS) {
      for (const c of nonFlatCutCases.filter((x) => x.board === id)) {
        const before = golden.boards.find((b) => b.id === id)!.facts.litres;
        const line = bottomLitresLine(litres(before - c.litresOff), litres(before));
        const hundredths = (printed: string) => Math.round(Number(printed) * 100);
        expect(hundredths(line.before) - hundredths(line.foamOff)).toBe(hundredths(line.now));
      }
    }
  });

  it("a flat bottom reads 0.00", () => {
    const before = litres(golden.boards[0].facts.litres);
    expect(bottomLitresLine(before, before).foamOff).toBe((0).toFixed(2));
  });
});
