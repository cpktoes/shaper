import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import golden from "./__fixtures__/bottom-golden.json";
import { phase16Boards, phase16SurfaceBoards } from "./__fixtures__/phase16-boards";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_FLOOR,
  BOTTOM_SECTIONS,
  bottomDataRows,
  bottomDataStations,
  bottomFloorFlags,
  bottomHasCut,
  bottomLayoutMarks,
  bottomLitresLine,
  bottomSampler,
  chan,
  CHANNEL_FLAT_KEY,
  CHANNEL_LEAD_IN,
  CHANNEL_OFF_RAIL_MIN,
  CHANNEL_STARTING_WIDTHS,
  channelEdges,
  channelFit,
  channelFoamOff,
  channelLayout,
  channelMarks,
  channelReadout,
  channelStart,
  channelWallKey,
  refAt,
  resolveChannels,
  startingChannels,
  type ChannelCount,
  cutFoamOff,
  cutFoamOffParts,
  cutHalfWidth,
  cutKind,
  deepestCutAt,
  DEFAULT_BOTTOM,
  doubleMarks,
  fadeAt,
  foamOff,
  isDefaultBottom,
  isTailVee,
  keepStationsInOrder,
  pickCut,
  PINCH,
  resolveBottom,
  resolveCut,
  rise,
  sec,
  smoothstep,
  startingCut,
  stationFromNearestTip,
  keepChannelStationsInOrder,
  storeChannelStation,
  storeCutStation,
  stringerAtCenter,
  switchChannelCount,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomCutSpec,
  type BottomSectionKey,
  type ResolvedBottom,
  type ResolvedCut,
} from "./bottom";
import type { DesignSummaryFields } from "./design";
import { deriveEffectiveRails, designBottomBoard, designCrossSectionInput, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES, summarizeDesign } from "./design";
import { frontFinStation } from "./fins";
import { buildOutline, foamHalfWidth, sampleOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { formatInchesFraction, inchesToMm, litres, mm, type Mm } from "./units";
import { boardSections } from "./volume";

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
  it("lists all eighteen names, six a section, in D-04's order: the golden's NAMES, name for name and in order", () => {
    expect(BOTTOM_CUT_NAMES.nose.length + BOTTOM_CUT_NAMES.center.length + BOTTOM_CUT_NAMES.tail.length).toBe(18);
    const allGolden = cases.filter((c) => c.kind === "cut") as CutCase[];
    for (const section of BOTTOM_SECTIONS) {
      // the sketch's own NAMES order, every name it has
      const sketchOrder = [...new Set(allGolden.filter((c) => c.section === section).map((c) => c.name))];
      expect(sketchOrder).toHaveLength(6);
      expect([...BOTTOM_CUT_NAMES[section]]).toEqual(sketchOrder);
      for (const name of BOTTOM_CUT_NAMES[section]) {
        const g = cutCases.find((c) => c.name === name)!;
        expect(cutKind(name)).toBe(g.cut.kind);
      }
    }
  });
});

describe("starting numbers (D-08): the sketch's makeCut, on each of the five boards", () => {
  it("covers 18 names on 5 boards", () => {
    expect(cutCases.length).toBe(18 * 5);
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

  it("resolveBottom reads the three sections and the channels, and passes the wing rule through", () => {
    const bottom: BoardBottom = { ...DEFAULT_BOTTOM, center: startingCut("center", "Deep Single Concave", board) };
    const r = resolveBottom(bottom, board);
    expect(r.center).toEqual(resolveCut("center", bottom.center, board));
    expect(r.nose).toEqual(resolveCut("nose", bottom.nose, board));
    expect(r.tail).toEqual(resolveCut("tail", bottom.tail, board));
    expect(r.channels).toEqual(resolveChannels(bottom.channels, board));
    expect(r.wingRule).toBe("narrowest");
  });
});

describe("a station slider's drag, stored (17-08: storeCutStation, stationFromNearestTip)", () => {
  it.each(BOTTOM_SECTIONS)("%s: each field's patch holds that field alone, and all three read back to the station dragged", (section) => {
    for (const { board } of BOARDS) {
      const name = BOTTOM_CUT_NAMES[section].find((n) => cutKind(n) !== "flat")!;
      const to = mm(board.length * 0.4);
      let spec = startingCut(section, name, board);
      for (const field of ["start", "deepest", "end"] as const) {
        const patch = storeCutStation(section, field, to, board);
        expect(Object.keys(patch)).toEqual([field]);
        spec = { ...spec, ...patch };
      }
      // all three at one station, so no order rule moves any of them on read
      const r = resolveCut(section, spec, board);
      for (const field of ["start", "deepest", "end"] as const) expect(Math.abs(r[field] - to)).toBeLessThan(TOL);
    }
  });

  it("a Nose station is taped from the nose and every other from the tail", () => {
    const board = boardById("shortboard");
    const s = mm(inchesToMm(20));
    expect(stationFromNearestTip("nose", s, board)).toBe(board.length - s);
    expect(stationFromNearestTip("center", s, board)).toBe(s);
    expect(stationFromNearestTip("tail", s, board)).toBe(s);
    // the label of a stored Nose station is the stored number itself
    const nose = startingCut("nose", "Teardrop Nose Concave", board);
    const r = resolveCut("nose", nose, board);
    expect(Math.abs(stationFromNearestTip("nose", r.start, board) - nose.start)).toBeLessThan(TOL);
  });
});

describe("stringerAtCenter (D-16): DATA's first line's stringer, at half the board's length", () => {
  it("reads the planed thickness and what the one number leaves of it at the stringer", () => {
    for (const { board } of BOARDS) {
      const s = mm(board.length / 2);
      const flat = stringerAtCenter(resolveBottom(DEFAULT_BOTTOM, board), board);
      expect(flat.planed).toBe(board.thicknessAt(s));
      expect(flat.left).toBe(flat.planed);
      const cut = resolveBottom({ ...DEFAULT_BOTTOM, center: startingCut("center", "Deep Single Concave", board) }, board);
      const read = stringerAtCenter(cut, board);
      expect(read.planed).toBe(flat.planed);
      expect(Math.abs(read.left - (read.planed - foamOff(cut, board, s, mm(0))))).toBeLessThan(TOL);
      expect(read.left).toBeLessThanOrEqual(read.planed);
    }
  });
});

describe("keepStationsInOrder (D-07): the sketch's normalize", () => {
  it("covers every station drag of the fifteen non-flat names, the three doubles' flat and trough line included", () => {
    expect(normalizeCases.length).toBe(15 * 3 * 3 * 5);
    expect(normalizeCases.filter((c) => cutKind(c.name as BottomCutName) === "double").length).toBe(3 * 3 * 3 * 5);
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
      const kept = keepStationsInOrder(section, dragged, field, board, "narrowest");
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
  it("covers the 15 non-flat names on 5 boards", () => {
    expect(nonFlatCutCases.length).toBe(15 * 5);
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
  const openings = openingCases.filter((c) => c.channels === 0);
  it("covers all five boards' openings, the Mid-length's and the Longboard's with this wave's names", () => {
    expect(openings.map((c) => c.board)).toEqual(["shortboard", "fish", "midlength", "longboard", "fishwing"]);
  });
  it.each(openings.map((c) => [c.board, c] as const))("%s's opening cuts equal the sketch's foamOff, and the floor does not bite", (_b, c) => {
    const board = boardById(c.board);
    const grid = gridOf(c.board);
    const resolved = resolveBottom(bottomOf(board, { nose: c.cuts.nose.name, center: c.cuts.center.name, tail: c.cuts.tail.name }), board);
    const concaveSum = (s: Mm, y: Mm) =>
      BOTTOM_SECTIONS.reduce((v, section) => v + cutFoamOffParts(resolved[section], board, resolved.wingRule, s, y).concave, 0);
    grid.s.forEach((s, k) => {
      grid.y[k].forEach((y, j) => {
        expect(concaveSum(mm(s), mm(y))).toBeLessThanOrEqual(floorCap(board, mm(s)));
        expect(Math.abs(foamOff(resolved, board, mm(s), mm(y)) - c.foamOff[k][j])).toBeLessThan(TOL);
      });
    });
  });
  it.each(nonFlatCutCases.map((c) => [c.board, c.name, c] as const))("%s · %s alone on the board: a concave is the sketch's foamOff held at the 1/4\" floor; a vee or belly is the sketch's own cut, never held (D-40)", (_b, _n, c) => {
    const board = boardById(c.board);
    const grid = gridOf(c.board);
    const resolved = resolveBottom(bottomOf(board, { [c.section]: c.name }), board);
    const concave = c.cut.kind === "single" || c.cut.kind === "double";
    grid.s.forEach((s, k) => {
      grid.y[k].forEach((y, j) => {
        if (c.cut.spiral) {
          // the Spiral Vee: its double is concave work, its vee a lift; at its starting numbers the floor never holds
          // the double, so the whole is the sketch's own cut
          expect(cutFoamOffParts(resolved[c.section], board, "narrowest", mm(s), mm(y)).concave).toBeLessThanOrEqual(floorCap(board, mm(s)));
          expect(Math.abs(foamOff(resolved, board, mm(s), mm(y)) - c.cutOff[k][j])).toBeLessThan(TOL);
          return;
        }
        const expected = concave ? Math.min(c.foamOff[k][j], floorCap(board, mm(s))) : c.cutOff[k][j];
        expect(Math.abs(foamOff(resolved, board, mm(s), mm(y)) - expected)).toBeLessThan(TOL);
      });
    });
  });
});

describe("a concave never leaves less than 1/4\" under the stringer (D-09); a vee or belly is never held and never touches the stringer (D-40)", () => {
  const thinStations = (board: BottomBoard): Mm[] => {
    const thin: Mm[] = [];
    for (let k = 0; k <= 400; k++) {
      const s = mm((board.length * k) / 400);
      if (board.thicknessAt(s) < inchesToMm(3 / 4) && board.railAt(s) > 0) thin.push(s);
    }
    return thin;
  };
  /** One name at `depth`, run from tip to tip so it reaches both ends at full depth. */
  const tipToTip = (board: BottomBoard, section: BottomSectionKey, name: BottomCutName, depth: Mm) => {
    const bottom = structuredClone(DEFAULT_BOTTOM);
    bottom[section] = { ...startingCut(section, name, board), depth };
    const ends = section === "nose" ? { start: mm(0), end: mm(board.length) } : { start: mm(board.length), end: mm(0) };
    bottom[section] = keepStationsInOrder(section, { ...bottom[section], ...ends }, "start", board, "narrowest");
    bottom[section] = keepStationsInOrder(section, { ...bottom[section], ...ends }, "end", board, "narrowest");
    return resolveBottom(bottom, board);
  };
  const names = (keep: (name: BottomCutName) => boolean) =>
    BOTTOM_SECTIONS.flatMap((section) => BOTTOM_CUT_NAMES[section].filter((n) => cutKind(n) !== "flat" && keep(n)).map((name) => ({ section, name })));

  it("at least three of the five boards thin under 3/4\" at a tip", () => {
    expect(BOARDS.filter(({ board }) => thinStations(board).length > 0).length).toBeGreaterThanOrEqual(3);
  });

  it.each(BOARDS.filter(({ board }) => thinStations(board).length > 0).map((b) => [b.id, b.board] as const))(
    "%s: a vee or belly at 1/2\" where the foam is under 3/4\" is its own cut, more than the foam holds somewhere, and 0 at the stringer",
    (_id, board) => {
      let pastTheFloor = 0;
      for (const { section, name } of names((n) => cutKind(n) !== "single")) {
        const resolved = tipToTip(board, section, name, inchesToMm(1 / 2));
        for (const s of thinStations(board)) {
          const W = board.railAt(s);
          for (let j = 0; j <= 12; j++) {
            const y = mm((W * j) / 12);
            const v = foamOff(resolved, board, s, y);
            expect(v).toBe(sumOfCuts(resolved, board, s, y));
            if (j === 0) expect(v).toBe(0);
            if (v > floorCap(board, s)) pastTheFloor++;
          }
        }
      }
      expect(pastTheFloor).toBeGreaterThan(0);
    },
  );

  it.each(BOARDS.map((b) => [b.id, b.board] as const))(
    "%s: a concave set deeper than the foam holds (2\", past the slider) is held so 1/4\" stays under the stringer",
    (_id, board) => {
      let held = 0;
      for (const { section, name } of names((n) => cutKind(n) === "single")) {
        const resolved = tipToTip(board, section, name, inchesToMm(2));
        for (let k = 0; k <= 200; k++) {
          const s = mm((board.length * k) / 200);
          const v = foamOff(resolved, board, s, mm(0));
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(floorCap(board, s) + TOL);
          if (sumOfCuts(resolved, board, s, mm(0)) > floorCap(board, s)) held++;
        }
      }
      expect(held).toBeGreaterThan(0);
    },
  );
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

describe("a diamond's V is cut (D-38): a Panel Vee takes foam off inside the V behind the tail block", () => {
  it("on every diamond of the surface set, foamOff is above 0 inside the V where the drawn outline is 0", () => {
    const diamonds = phase16SurfaceBoards().filter((b) => b.label.includes("|diamond|"));
    expect(diamonds.length).toBeGreaterThan(0);
    for (const { label, fields } of diamonds) {
      const board = bottomBoardOf(fields);
      const geometry = buildOutline(fields.outline);
      const resolved = resolveBottom(bottomOf(board, { tail: "Panel Vee" }), board);
      const inV = Array.from({ length: 30 }, (_, k) => mm(k * 3)).filter(
        (s) => sampleOutline(geometry, s) === 0 && foamHalfWidth(geometry, s) > 0,
      );
      expect(inV.length, label).toBeGreaterThan(0);
      for (const s of inV) {
        expect(foamOff(resolved, board, s, mm(foamHalfWidth(geometry, s) * 0.9)), `${label} at ${s}`).toBeGreaterThan(0);
      }
    }
  });
});

/* ============ 17-05: the doubles, the Spiral Vee, the Tri-Plane, the Teardrop's closing, D-42 ============ */

const NEW_NAMES = ["Teardrop Nose Concave", "Early Double Concave", "Tri-Plane Hull Center", "Double Concave Exit", "Spiral Vee"] as const;
const TAIL_VEES = ["Panel Vee", "Spiral Vee", "Rolled Vee"] as const;

describe("the five names of 17-05 against the golden", () => {
  it("are each in the place D-04 gives them", () => {
    expect(BOTTOM_CUT_NAMES.nose[2]).toBe("Teardrop Nose Concave");
    expect(BOTTOM_CUT_NAMES.center[3]).toBe("Early Double Concave");
    expect(BOTTOM_CUT_NAMES.center[5]).toBe("Tri-Plane Hull Center");
    expect(BOTTOM_CUT_NAMES.tail[1]).toBe("Double Concave Exit");
    expect(BOTTOM_CUT_NAMES.tail[3]).toBe("Spiral Vee");
    expect(NEW_NAMES.map((n) => cutKind(n))).toEqual(["single", "double", "vee", "double", "double"]);
  });
  it("the Spiral Vee alone is the spiral, and all five are in the golden on all five boards", () => {
    for (const { board } of BOARDS) {
      for (const section of BOTTOM_SECTIONS) {
        for (const name of BOTTOM_CUT_NAMES[section]) {
          expect(resolveCut(section, startingCut(section, name, board), board).spiral).toBe(name === "Spiral Vee");
        }
      }
    }
    expect(nonFlatCutCases.filter((c) => (NEW_NAMES as readonly string[]).includes(c.name))).toHaveLength(5 * 5);
  });
  it("the Tri-Plane's flat panel is half the wide width less 4\", and the Spiral Vee's vee 3/16\", read from the board", () => {
    for (const { id, board } of BOARDS) {
      const g = cutCases.find((c) => c.board === id && c.name === "Tri-Plane Hull Center")!;
      const tri = resolveCut("center", startingCut("center", "Tri-Plane Hull Center", board), board);
      expect(Math.abs(tri.offStringer - (board.widePointWidth / 2 - inchesToMm(4)))).toBeLessThan(TOL);
      expect(Math.abs(tri.offStringer - g.cut.offS)).toBeLessThan(TOL);
      expect(resolveCut("tail", startingCut("tail", "Spiral Vee", board), board).veeLift).toBe(inchesToMm(3 / 16));
    }
  });
});

describe("the double (D-05): ported line for line", () => {
  const board = boardById("shortboard");

  it("doubleMarks keeps the flat at most half the width, the trough at least 1/4\" outside it and inside 85%", () => {
    const cut = resolveCut("center", startingCut("center", "Early Double Concave", board), board);
    for (const C of [0, 5, 10, 20, 40, 80, 160, 240].map(mm)) {
      const { flat, trough } = doubleMarks(cut, C);
      expect(flat).toBeLessThanOrEqual(Math.max(0, C * 0.5) + TOL);
      expect(flat).toBeLessThanOrEqual(cut.offStringer);
      expect(trough).toBeGreaterThanOrEqual(flat + inchesToMm(1 / 4) - TOL);
      if (C * 0.85 >= flat + inchesToMm(1 / 4)) expect(trough).toBeLessThanOrEqual(C * 0.85 + TOL);
    }
    // a wide cut keeps the numbers as set
    expect(doubleMarks(cut, mm(240))).toEqual({ flat: cut.offStringer, trough: cut.troughAt });
  });

  it("takes nothing inside its flat, is deepest at its trough and nothing at its edge", () => {
    const cut = resolveCut("center", startingCut("center", "Early Double Concave", board), board);
    const s = cut.deepest;
    const C = cutHalfWidth(cut, board, "narrowest", s);
    const { flat, trough } = doubleMarks(cut, C);
    for (let j = 0; j <= 20; j++) expect(cutFoamOff(cut, board, "narrowest", s, mm((flat * j) / 20))).toBe(0);
    const atTrough = cutFoamOff(cut, board, "narrowest", s, trough);
    expect(Math.abs(atTrough - cut.depth * Math.min(1, (C - flat) / PINCH))).toBeLessThan(TOL);
    for (let j = 0; j <= 40; j++) {
      const y = mm(flat + ((C - flat) * j) / 40);
      expect(cutFoamOff(cut, board, "narrowest", s, y)).toBeLessThanOrEqual(atTrough + TOL);
    }
    expect(cutFoamOff(cut, board, "narrowest", s, C)).toBe(0);
  });

  it("a Deep Single stacked on an Early Double: at the stringer the one number is the single's own term — the stringer stays the ridge", () => {
    const resolved = resolveBottom(bottomOf(board, { center: "Early Double Concave" }), board);
    const single = resolveCut("center", startingCut("center", "Deep Single Concave", board), board);
    const stacked: ResolvedBottom = { ...resolved, nose: { ...single, section: "nose" } };
    let both = 0;
    for (let k = 0; k <= 200; k++) {
      const s = mm((board.length * k) / 200);
      const own = cutFoamOff(single, board, "narrowest", s, mm(0));
      expect(cutFoamOff(resolved.center, board, "narrowest", s, mm(0))).toBe(0);
      expect(Math.abs(foamOff(stacked, board, s, mm(0)) - Math.min(own, floorCap(board, s)))).toBeLessThan(TOL);
      if (own > 0 && cutFoamOff(resolved.center, board, "narrowest", s, inchesToMm(4)) > 0) both++;
    }
    expect(both).toBeGreaterThan(0);
  });

  it("the Spiral Vee is the double with a Vee Lift veeLift × fade × rise(y / W, 0) added — nothing of it at the stringer", () => {
    for (const { board: b } of BOARDS) {
      const spiral = resolveCut("tail", startingCut("tail", "Spiral Vee", b), b);
      const double: ResolvedCut = { ...spiral, spiral: false };
      for (let k = 0; k <= 60; k++) {
        const s = mm((spiral.start * k) / 60);
        const W = b.railAt(s);
        if (W <= 0) continue;
        const f = fadeAt(spiral.start, spiral.deepest, spiral.end, s, b.length);
        for (let j = 0; j <= 12; j++) {
          const y = mm((W * j) / 12);
          const vee = spiral.veeLift * f * rise(Math.min(1, y / W), 0);
          expect(Math.abs(cutFoamOff(spiral, b, "narrowest", s, y) - (cutFoamOff(double, b, "narrowest", s, y) + vee))).toBeLessThan(TOL);
          expect(Math.abs(cutFoamOffParts(spiral, b, "narrowest", s, y).lift - vee)).toBeLessThan(TOL);
        }
        expect(cutFoamOffParts(spiral, b, "narrowest", s, mm(0)).lift).toBe(0);
      }
    }
  });

  it("D-40: the Tri-Plane's planes and the Spiral Vee's vee are never held and never touch the stringer; the doubles are held at the floor", () => {
    for (const { board: b } of BOARDS) {
      for (const [section, name] of [["center", "Tri-Plane Hull Center"], ["tail", "Spiral Vee"]] as const) {
        const resolved = resolveBottom(bottomOf(b, { [section]: name }), b);
        for (let k = 0; k <= 100; k++) {
          const s = mm((b.length * k) / 100);
          expect(cutFoamOffParts(resolved[section], b, "narrowest", s, mm(0)).lift).toBe(0);
          if (name === "Tri-Plane Hull Center") expect(foamOff(resolved, b, s, mm(0))).toBe(0);
        }
      }
      // a double set deeper than the foam holds (2") is held so 1/4" stays under the planed thickness
      for (const [section, name] of [["center", "Early Double Concave"], ["tail", "Double Concave Exit"]] as const) {
        const bottom = bottomOf(b, { [section]: name });
        bottom[section] = { ...bottom[section], depth: inchesToMm(2) };
        const resolved = resolveBottom(bottom, b);
        let held = 0;
        for (let k = 0; k <= 100; k++) {
          const s = mm((b.length * k) / 100);
          const W = b.railAt(s);
          for (let j = 0; j <= 24; j++) {
            const y = mm((W * j) / 24);
            expect(foamOff(resolved, b, s, y)).toBeLessThanOrEqual(floorCap(b, s) + TOL);
            if (cutFoamOff(resolved[section], b, "narrowest", s, y) > floorCap(b, s)) held++;
          }
        }
        expect(held).toBeGreaterThan(0);
      }
    }
  });
});

describe("the Teardrop's closing (D-06, D-32)", () => {
  it("ticks closesToPoint on the Teardrop alone; the Blended Nose Concave and the Slight Single Concave Entry open unticked", () => {
    for (const { board } of BOARDS) {
      expect(startingCut("nose", "Teardrop Nose Concave", board).closesToPoint).toBe(true);
      expect(startingCut("nose", "Blended Nose Concave", board).closesToPoint).toBe(false);
      expect(startingCut("nose", "Slight Single Concave Entry", board).closesToPoint).toBe(false);
    }
  });

  it.each(BOARDS.map((b) => [b.id, b.board] as const))("%s: the Teardrop's half-width is 0 at its End and grows as √ to its Deepest", (_id, board) => {
    const tear = resolveCut("nose", startingCut("nose", "Teardrop Nose Concave", board), board);
    const open: ResolvedCut = { ...tear, closesToPoint: false };
    expect(cutHalfWidth(tear, board, "narrowest", tear.end)).toBe(0);
    for (let k = 1; k <= 40; k++) {
      const s = mm(tear.end + ((tear.deepest - tear.end) * k) / 41);
      const root = Math.sqrt((s - tear.end) / (tear.deepest - tear.end));
      expect(Math.abs(cutHalfWidth(tear, board, "narrowest", s) - cutHalfWidth(open, board, "narrowest", s) * root)).toBeLessThan(TOL);
    }
    for (let k = 0; k <= 20; k++) {
      const s = mm(tear.deepest + ((tear.start - tear.deepest) * k) / 20);
      expect(cutHalfWidth(tear, board, "narrowest", s)).toBe(cutHalfWidth(open, board, "narrowest", s));
    }
  });

  it.each(["Blended Nose Concave", "Slight Single Concave Entry"] as const)("ticking it on the %s closes it the same way", (name) => {
    for (const { board } of BOARDS) {
      const open = resolveCut("nose", startingCut("nose", name, board), board);
      const closed: ResolvedCut = { ...open, closesToPoint: true };
      let narrowed = 0;
      for (let k = 0; k <= 60; k++) {
        const s = mm(open.end + ((open.start - open.end) * k) / 60);
        const C = cutHalfWidth(open, board, "narrowest", s);
        if (C <= 0) continue;
        if (s >= open.deepest) {
          for (let j = 0; j <= 12; j++) {
            const y = mm((C * j) / 12);
            expect(cutFoamOff(closed, board, "narrowest", s, y)).toBe(cutFoamOff(open, board, "narrowest", s, y));
          }
          continue;
        }
        const root = Math.sqrt(Math.max(0, (s - open.end) / (open.deepest - open.end)));
        const Ck = C * root;
        if (Ck <= 0) {
          expect(cutFoamOff(closed, board, "narrowest", s, mm(0))).toBe(0);
          continue;
        }
        narrowed++;
        // the closed cut at y·root is the open cut at y, but for the narrower cut's own shallowing under 3"
        for (let j = 0; j < 12; j++) {
          const y = (C * j) / 12;
          const a = cutFoamOff(closed, board, "narrowest", s, mm(y * root)) / Math.min(1, Ck / PINCH);
          const b = cutFoamOff(open, board, "narrowest", s, mm(y)) / Math.min(1, C / PINCH);
          expect(Math.abs(a - b)).toBeLessThan(1e-7);
        }
      }
      expect(narrowed).toBeGreaterThan(0);
    }
  });
});

describe("Start ≥ Deepest ≥ End on every board with fins (the SPEC edge, complete)", () => {
  it("every non-flat name's starting cut and every starting channel set keeps its order and stays on the board, on the five golden boards and every Phase 16 board with fins", () => {
    const surface = phase16SurfaceBoards()
      .map(({ label, fields }) => ({ label, board: bottomBoardOf(fields) }))
      .filter(({ board }) => board.frontFins > 0);
    const boards = [...BOARDS.map(({ id, board }) => ({ label: id, board })), ...surface];
    let checked = 0;
    for (const { label, board } of boards) {
      for (const section of BOTTOM_SECTIONS) {
        for (const name of BOTTOM_CUT_NAMES[section]) {
          if (cutKind(name) === "flat") continue;
          for (const tail of [undefined, "Panel Vee" as const]) {
            const r = resolveCut(section, startingCut(section, name, board, tail), board);
            const where = `${label} · ${name}${tail ? " with a tail vee" : ""}`;
            expect(r.start, where).toBeGreaterThanOrEqual(r.deepest);
            expect(r.deepest, where).toBeGreaterThanOrEqual(r.end);
            expect(r.end, where).toBeGreaterThanOrEqual(0);
            expect(r.start, where).toBeLessThanOrEqual(board.length);
            checked++;
          }
        }
      }
      // the channels: every count and length order at its starting numbers — the set and each channel's own start
      for (const count of [4, 6, 8] as const) {
        for (const longest of ["inner", "outer", "same"] as const) {
          const ch = resolveChannels({ ...startingChannels(count, board, DEFAULT_BOTTOM.channels), longest }, board);
          const where = `${label} · ${count} channels, the ${longest} longest`;
          expect(ch.start, where).toBeGreaterThanOrEqual(ch.deepest);
          expect(ch.deepest, where).toBeGreaterThanOrEqual(ch.end);
          expect(ch.end, where).toBeGreaterThanOrEqual(0);
          expect(ch.start, where).toBeLessThanOrEqual(board.length);
          for (let j = 0; j < count / 2; j++) {
            expect(channelStart(ch, j), where).toBeGreaterThanOrEqual(ch.deepest);
            expect(channelStart(ch, j), where).toBeLessThanOrEqual(ch.start);
          }
          checked++;
        }
      }
    }
    console.info(
      `Start ≥ Deepest ≥ End held on ${checked} starting cuts (${boards.length} boards × 15 names, with and without a tail vee, and 9 channel sets)`,
    );
    expect(checked).toBe(boards.length * (15 * 2 + 9));
  });
});

describe("D-42: a center single fades out before a tail vee peaks (the founder, 2026-11-08)", () => {
  const SINGLES = ["Deep Single Concave", "Shallow Single Concave"] as const;

  it("names the three tail vees", () => {
    expect(BOTTOM_CUT_NAMES.tail.filter((n) => isTailVee(n))).toEqual([...TAIL_VEES]);
  });

  it.each(BOARDS.map((b) => [b.id, b.board] as const))("%s: with a tail vee a center single is deepest halfway from the wide point to the fins and ends at the fins", (_id, board) => {
    for (const name of SINGLES) {
      const plain = resolveCut("center", startingCut("center", name, board), board);
      for (const tail of BOTTOM_CUT_NAMES.tail) {
        const r = resolveCut("center", startingCut("center", name, board, tail), board);
        if (!isTailVee(tail)) {
          expect(r).toEqual(plain);
          continue;
        }
        expect(Math.abs(r.deepest - (board.widePoint + board.frontFins) / 2)).toBeLessThan(TOL);
        expect(r.end).toBe(board.frontFins);
        expect(r.start).toBe(plain.start);
        expect({ ...r, deepest: 0, end: 0 }).toEqual({ ...plain, deepest: 0, end: 0 });
        // the single has run out where the vee is deepest
        const vee = resolveCut("tail", startingCut("tail", tail, board), board);
        const W = board.railAt(vee.deepest);
        for (let j = 0; j <= 12; j++) expect(cutFoamOff(r, board, "narrowest", vee.deepest, mm((W * j) / 12))).toBe(0);
      }
    }
    // the Deep Single already peaked there: only its End moves; the Shallow Single's Deepest moves ahead of the fins
    const deep = resolveCut("center", startingCut("center", "Deep Single Concave", board), board);
    const deepWithVee = resolveCut("center", startingCut("center", "Deep Single Concave", board, "Rolled Vee"), board);
    expect(deepWithVee.deepest).toBe(deep.deepest);
    expect(deepWithVee.end).toBeGreaterThan(deep.end);
    const shallow = resolveCut("center", startingCut("center", "Shallow Single Concave", board), board);
    const shallowWithVee = resolveCut("center", startingCut("center", "Shallow Single Concave", board, "Rolled Vee"), board);
    expect(shallow.deepest).toBe(board.frontFins);
    expect(shallowWithVee.deepest).toBeGreaterThan(shallow.deepest);
  });

  it.each(BOARDS.map((b) => [b.id, b.board] as const))("%s: picking a tail vee re-seats a center single still on its starting numbers, in one step; a single set by hand is never touched", (_id, board) => {
    for (const name of SINGLES) {
      for (const vee of TAIL_VEES) {
        // a single picked on a flat tail, then a vee picked
        const opened = pickCut(DEFAULT_BOTTOM, "center", name, board);
        expect(opened.center).toEqual(startingCut("center", name, board));
        const withVee = pickCut(opened, "tail", vee, board);
        expect(withVee.tail).toEqual(startingCut("tail", vee, board));
        expect(withVee.center).toEqual(startingCut("center", name, board, vee));
        expect(withVee.center).not.toEqual(opened.center);
        expect(opened.center).toEqual(startingCut("center", name, board)); // the step wrote nothing back
        // picking the single with the vee already there opens it on the vee's numbers
        expect(pickCut(pickCut(DEFAULT_BOTTOM, "tail", vee, board), "center", name, board).center).toEqual(withVee.center);
        // a vee to another vee leaves it; a vee to a flat exit puts the sketch's numbers back
        expect(pickCut(withVee, "tail", "Rolled Vee", board).center).toEqual(withVee.center);
        expect(pickCut(withVee, "tail", "Flat Exit", board).center).toEqual(opened.center);
        // set by hand: never touched, either way
        const byHand: BoardBottom = { ...opened, center: { ...opened.center, depth: mm(opened.center.depth + 1) } };
        expect(pickCut(byHand, "tail", vee, board).center).toBe(byHand.center);
        const byHandOnVee: BoardBottom = { ...withVee, center: { ...withVee.center, end: mm(withVee.center.end + 10) } };
        expect(pickCut(byHandOnVee, "tail", "Flat Exit", board).center).toBe(byHandOnVee.center);
      }
    }
    // a center that is not a single is never moved by a tail pick
    for (const name of BOTTOM_CUT_NAMES.center.filter((n) => cutKind(n) !== "single")) {
      const opened = pickCut(DEFAULT_BOTTOM, "center", name, board);
      expect(pickCut(opened, "tail", "Panel Vee", board).center).toBe(opened.center);
    }
  });

  it("the golden's figures for a single alone are unchanged: with no tail named, every center single opens on the sketch's own numbers", () => {
    const singles = cutCases.filter((x) => x.section === "center" && x.cut.kind === "single");
    expect(singles).toHaveLength(2 * 5);
    for (const c of singles) {
      const board = boardById(c.board);
      expectSketchCut(resolveCut("center", startingCut("center", c.name as BottomCutName, board), board), c.cut);
      expectSketchCut(resolveCut("center", pickCut(DEFAULT_BOTTOM, "center", c.name as BottomCutName, board).center, board), c.cut);
    }
  });
});

/* ============ 17-05 Task 2: DATA's numbers — the depths, the layout marks, the floor ============ */

type OpeningMarks = { s: number; marks: Record<string, { y: number; col: string }[]> };
type OpeningWithMarks = OpeningCase & { columns: Record<string, string[]>; marks: OpeningMarks[] };
const SECTION_TITLE: Record<BottomSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };
/** A golden column name (`Center edge`) as the app's key (`center:edge`). */
const keyOfColumn = (section: BottomSectionKey, col: string) => {
  const mark = col.slice(SECTION_TITLE[section].length + 1);
  expect(`${SECTION_TITLE[section]} ${mark}`).toBe(col);
  return `${section}:${mark}`;
};

/** The sections VOLUME, the 3D board and the CNC files read, for a board with this bottom. */
function sectionsOf(fields: DesignSummaryFields, bottom: BoardBottom) {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const board = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  return boardSections(designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom, board }));
}

describe("DATA: the depths every 6\" (D-16, R8)", () => {
  const board = boardById("shortboard");
  const resolved = resolveBottom(bottomOf(board, { center: "Deep Single Concave" }), board);
  const rows = bottomDataRows(resolved, board);

  it("DATA rows run from the tail every 6\" to the nose tip", () => {
    expect(rows[0].station).toBe(0);
    expect(rows[0].label).toBe("tail");
    expect(rows[rows.length - 1].station).toBe(board.length);
    expect(rows[rows.length - 1].label).toBe("nose");
    expect(bottomDataStations(board)).toEqual(rows.map((r) => r.station));
    for (let k = 1; k < rows.length - 1; k++) {
      expect(rows[k].label).toBe("station");
      expect(Math.abs(rows[k].station - rows[k - 1].station - inchesToMm(6))).toBeLessThan(1e-6);
    }
    expect(board.length - rows[rows.length - 2].station).toBeGreaterThan(0);
    expect(board.length - rows[rows.length - 2].station).toBeLessThanOrEqual(inchesToMm(6) + 1);
  });

  it("DATA: every figure is the one number read at the row", () => {
    let cutting = 0;
    for (const r of rows) {
      const W = board.railAt(r.station);
      expect(r.railLift).toBe(foamOff(resolved, board, r.station, W));
      expect(r.deepest).toBe(deepestCutAt(resolved, board, r.station));
      expect(r.deepest).toBeGreaterThanOrEqual(r.railLift);
      expect(r.deepest).toBeGreaterThanOrEqual(foamOff(resolved, board, r.station, mm(0)));
      if (W > 0.5) {
        expect(r.width).toBe(2 * W);
        expect(r.stringerLeft).toBe(board.thicknessAt(r.station) - foamOff(resolved, board, r.station, mm(0)));
      } else {
        expect(r.width).toBeNull();
        expect(r.stringerLeft).toBeNull();
      }
      expect(r.atFloor).toBe(false);
      if (r.deepest > 0) cutting++;
    }
    expect(cutting).toBeGreaterThan(2);
    // a concave lifts nothing at the rail
    expect(rows.every((r) => r.railLift === 0)).toBe(true);
  });

  it("DATA: exactly one row is the wide point's and one the front fins', each within 3\"", () => {
    for (const { board: b } of BOARDS) {
      const all = bottomDataRows(resolveBottom(DEFAULT_BOTTOM, b), b);
      const wide = all.filter((r) => r.reference === "wide");
      const fins = all.filter((r) => r.reference === "fins");
      expect(wide).toHaveLength(1);
      expect(fins).toHaveLength(1);
      expect(Math.abs(wide[0].station - b.widePoint)).toBeLessThan(inchesToMm(3));
      expect(Math.abs(fins[0].station - b.frontFins)).toBeLessThan(inchesToMm(3));
    }
  });

  it("DATA: a flat bottom gives no deepest cut and no rail lift at any row, and the stringer its planed thickness", () => {
    for (const { board: b } of BOARDS) {
      for (const r of bottomDataRows(resolveBottom(DEFAULT_BOTTOM, b), b)) {
        expect(r.deepest).toBe(0);
        expect(r.railLift).toBe(0);
        if (r.stringerLeft !== null) expect(r.stringerLeft).toBe(b.thicknessAt(r.station));
      }
    }
  });

  it("DATA: a vee's rail lift is its depth where it is deepest, and it leaves the stringer as planed", () => {
    const fish = boardById("fish");
    const vee = resolveBottom(bottomOf(fish, { tail: "Panel Vee" }), fish);
    const all = bottomDataRows(vee, fish);
    for (const r of all) {
      if (r.stringerLeft !== null) expect(r.stringerLeft).toBe(fish.thicknessAt(r.station));
      expect(r.railLift).toBe(foamOff(vee, fish, r.station, fish.railAt(r.station)));
    }
    expect(all.some((r) => r.railLift > 0)).toBe(true);
  });

  it("DATA: inside a swallow's notch the stringer is air, so Stringer left reads nothing", () => {
    const fields = phase16Boards().find((b) => b.label === "shortboard|swallow|hard")!.fields;
    const swallow = bottomBoardOf(fields);
    const all = bottomDataRows(resolveBottom(bottomOf(swallow, { tail: "Panel Vee" }), swallow), swallow);
    expect(all[0].stringerLeft).toBeNull();
    expect(all[0].width).not.toBeNull();
  });

  it("DATA: a row where the floor holds a concave is flagged, and its stringer left is the 1/4\" floor", () => {
    const deep = bottomOf(board, { center: "Deep Single Concave" });
    deep.center = keepStationsInOrder("center", { ...deep.center, depth: inchesToMm(2), end: mm(0) }, "end", board, "narrowest");
    const held = bottomDataRows(resolveBottom(deep, board), board).filter((r) => r.atFloor);
    expect(held.length).toBeGreaterThan(0);
    for (const r of held) expect(Math.abs(r.stringerLeft! - BOTTOM_FLOOR)).toBeLessThan(TOL);
  });
});

describe("DATA: the layout marks off the stringer (D-16) — golden", () => {
  const openings = (cases.filter((c) => c.kind === "opening") as OpeningWithMarks[]).filter((c) => c.channels === 0);

  it.each(openings.map((c) => [c.board, c] as const))("%s's opening: the columns are the sketch's markColumns and every 6\" the cells its marksOf", (_b, c) => {
    const board = boardById(c.board);
    const resolved = resolveBottom(bottomOf(board, { nose: c.cuts.nose.name, center: c.cuts.center.name, tail: c.cuts.tail.name }), board);
    const goldenKeys = BOTTOM_SECTIONS.flatMap((section) => (c.columns[section] ?? []).map((col) => keyOfColumn(section, col)));
    const { columns, rows } = bottomLayoutMarks(resolved, board, c.marks.map((m) => mm(m.s)));
    expect(columns.map((col) => col.key)).toEqual(goldenKeys);
    for (const col of columns) expect(col.key).toBe(`${col.section}:${col.mark}`);
    let marked = 0;
    c.marks.forEach((m, k) => {
      expect(rows[k].station).toBe(m.s);
      columns.forEach((col, j) => {
        const section = col.section as BottomSectionKey;
        const g = (m.marks[section] ?? []).find((x) => keyOfColumn(section, x.col) === col.key);
        const cell = rows[k].cells[j];
        if (!g) expect(cell).toBeNull();
        else {
          expect(cell).not.toBeNull();
          expect(Math.abs(cell! - g.y)).toBeLessThan(TOL);
          marked++;
        }
      });
      // and nothing the sketch marks is missing a column
      for (const section of BOTTOM_SECTIONS) for (const x of m.marks[section] ?? []) expect(goldenKeys).toContain(keyOfColumn(section, x.col));
    });
    if (goldenKeys.length > 0) expect(marked).toBeGreaterThan(0);
  });

  it("DATA: the openings with marks are the singles' and the Spiral Vee's double (flat, trough, edge)", () => {
    const withMarks = openings.filter((c) => BOTTOM_SECTIONS.some((s) => (c.columns[s] ?? []).length > 0)).map((c) => c.board);
    expect(withMarks).toContain("midlength");
    const mid = openings.find((c) => c.board === "midlength")!;
    expect(mid.columns.tail.map((col) => keyOfColumn("tail", col))).toEqual(["tail:flat", "tail:trough", "tail:edge"]);
  });

  it("DATA: a flat bottom gives no columns; a belly or a plain vee none either", () => {
    for (const { board } of BOARDS) {
      expect(bottomLayoutMarks(resolveBottom(DEFAULT_BOTTOM, board), board).columns).toEqual([]);
      expect(bottomLayoutMarks(resolveBottom(bottomOf(board, { nose: "Rolled Belly Entry", tail: "Panel Vee" }), board), board).columns).toEqual([]);
    }
  });

  it("DATA: the Tri-Plane rules its flat panel's edge, Off Stringer out, wherever it cuts", () => {
    for (const { board } of BOARDS) {
      const resolved = resolveBottom(bottomOf(board, { center: "Tri-Plane Hull Center" }), board);
      const { columns, rows } = bottomLayoutMarks(resolved, board);
      expect(columns.map((c) => c.key)).toEqual(["center:flat"]);
      let marked = 0;
      for (const r of rows) {
        const f = fadeAt(resolved.center.start, resolved.center.deepest, resolved.center.end, r.station, board.length);
        const shown = f > 0.004 && resolved.center.offStringer < board.railAt(r.station);
        expect(r.cells[0]).toBe(shown ? resolved.center.offStringer : null);
        if (shown) marked++;
      }
      expect(marked).toBeGreaterThan(0);
    }
  });

  it("DATA: a double's marks stay in order at every row — flat, then trough, then edge", () => {
    for (const { board } of BOARDS) {
      for (const [section, name] of [["center", "Early Double Concave"], ["tail", "Double Concave Exit"], ["tail", "Spiral Vee"]] as const) {
        const { columns, rows } = bottomLayoutMarks(resolveBottom(bottomOf(board, { [section]: name }), board), board);
        expect(columns.map((c) => c.mark)).toEqual(["flat", "trough", "edge"]);
        for (const r of rows) {
          const [flat, trough, edge] = r.cells;
          if (flat !== null && trough !== null) expect(trough).toBeGreaterThan(flat);
          if (trough !== null && edge !== null) expect(edge).toBeGreaterThan(trough);
        }
      }
    }
  });
});

describe("DATA: where a cut meets the 1/4\" floor (D-09, D-33, D-40)", () => {
  const openings = (cases.filter((c) => c.kind === "opening") as OpeningCase[]).filter((c) => c.channels === 0);
  /** One single at `depth`, run out to a tip: the nose tip (its Start) or the tail (its End). */
  const toTip = (board: BottomBoard, section: BottomSectionKey, name: BottomCutName, tip: "nose" | "tail", depth: Mm): BoardBottom => {
    const bottom = structuredClone(DEFAULT_BOTTOM);
    const cut = { ...startingCut(section, name, board), depth };
    // stored from the nose for a Nose cut (D-39), from the tail otherwise
    const field = tip === "nose" ? "start" : "end";
    const value = tip === "nose" ? (section === "nose" ? mm(0) : board.length) : section === "nose" ? board.length : mm(0);
    bottom[section] = keepStationsInOrder(section, { ...cut, [field]: value }, field, board, "narrowest");
    return bottom;
  };
  const SINGLES = BOTTOM_SECTIONS.flatMap((section) => BOTTOM_CUT_NAMES[section].filter((n) => cutKind(n) === "single").map((name) => ({ section, name })));

  it.each(openings.map((c) => [c.board, c] as const))("%s's opening cuts never meet the stringer floor; a tail vee that thins the rail edge under 1/4\" is flagged there, behind the fins", (_b, c) => {
    const { fields } = FIELDS.find((f) => f.id === c.board)!;
    const board = bottomBoardOf(fields);
    const bottom = bottomOf(board, { nose: c.cuts.nose.name, center: c.cuts.center.name, tail: c.cuts.tail.name });
    const sections = sectionsOf(fields, bottom);
    const flags = bottomFloorFlags(resolveBottom(bottom, board), board, sections);
    expect(flags.flatMap((f) => f.stringer)).toEqual([]);
    // D-40: a lift that leaves the rail under 1/4" is flagged, never cut shallower — on these boards only the tail's
    // vees do it, at the rail's edge in the last few inches of the tail
    for (const flag of flags) {
      expect(flag.section).toBe("tail");
      expect(isTailVee(c.cuts.tail.name as BottomCutName)).toBe(true);
      for (const s of flag.rails) {
        expect(s).toBeLessThan(board.frontFins);
        expect(sections.find((x) => x.station === s)!.thinAt!.length).toBeGreaterThan(0);
      }
      expect(flag.at).toBe(Math.min(...flag.rails));
      console.info(`${c.board}: ${c.cuts.tail.name} thins the rail edge under 1/4" at ${flag.rails.map((x) => formatInchesFraction(mm(x))).join(", ")} from the tail`);
    }
  });

  it.each(BOARDS.map((b) => [b.id, b.board] as const))("%s: no single at 1/2\" run out to either tip meets the stringer floor", (_id, board) => {
    expect(SINGLES).toHaveLength(6);
    for (const { section, name } of SINGLES) {
      for (const tip of ["nose", "tail"] as const) {
        const bottom = toTip(board, section, name, tip, inchesToMm(1 / 2));
        const r = resolveBottom(bottom, board);
        expect(tip === "nose" ? r[section].start : r[section].end).toBe(tip === "nose" ? board.length : 0);
        expect(bottomFloorFlags(r, board).flatMap((f) => f.stringer), `${name} to the ${tip}`).toEqual([]);
      }
    }
  });

  it("a concave set deeper than the foam holds meets the stringer floor, and its flag's `at` is the station nearest its own tip", () => {
    const board = boardById("shortboard");
    for (const { section, name } of SINGLES) {
      const tip = section === "nose" ? "nose" : "tail";
      const r = resolveBottom(toTip(board, section, name, tip, inchesToMm(2)), board);
      const flags = bottomFloorFlags(r, board);
      expect(flags.map((f) => f.section)).toEqual([section]);
      const [flag] = flags;
      expect(flag.stringer.length).toBeGreaterThan(0);
      expect(flag.rails).toEqual([]);
      expect(flag.at).toBe(tip === "nose" ? Math.max(...flag.stringer) : Math.min(...flag.stringer));
      // every flagged station is one the floor really holds
      for (const s of flag.stringer) expect(cutFoamOff(r[section], board, "narrowest", s, mm(0))).toBeGreaterThan(floorCap(board, s));
    }
  });

  it("a Rolled Belly Entry at 1/2\" on the Shortboard leaves the rail under 1/4\" near the nose: the rail form, `at` nearest the nose", () => {
    const { fields } = FIELDS.find((f) => f.id === "shortboard")!;
    const board = bottomBoardOf(fields);
    const bottom = bottomOf(board, { nose: "Rolled Belly Entry" });
    bottom.nose = { ...bottom.nose, depth: inchesToMm(1 / 2) };
    const sections = sectionsOf(fields, bottom);
    const flags = bottomFloorFlags(resolveBottom(bottom, board), board, sections);
    expect(flags.map((f) => f.section)).toEqual(["nose"]);
    const [flag] = flags;
    expect(flag.stringer).toEqual([]);
    expect(flag.rails.length).toBeGreaterThan(0);
    for (const s of flag.rails) {
      expect(s).toBeGreaterThan(board.length / 2);
      expect(sections.find((x) => x.station === s)!.thinAt!.length).toBeGreaterThan(0);
    }
    expect(flag.at).toBe(Math.max(...flag.rails));
    // without the sections there is no rail form to read
    expect(bottomFloorFlags(resolveBottom(bottom, board), board)).toEqual([]);
  });
});

/* ============ 17-06 Task 1: the channels (D-03, D-05, D-10, D-11, D-16) ============ */

type GoldenChannels = { count: number; depth: number; width: number; offS: number; start: number; deep: number; end: number; smooth: number; run: string; longer: string; stagger: number };
type GoldenChannelMark = { y: number; col: string; on: boolean };
type ChannelsCase = {
  kind: "channels";
  board: string;
  count: ChannelCount;
  run: "parallel" | "rail" | "toe";
  longer: "inner" | "outer" | "same";
  ch: GoldenChannels;
  fit: { n: number; w: number; offRail: number; squeezed: boolean };
  starts: number[];
  stations: { s: number; edges: [number, number, number][]; marks: GoldenChannelMark[] }[];
};
type OpeningWithChannels = OpeningWithMarks & { cuts: Record<string, GoldenCut & Partial<GoldenChannels>> };

const channelsCases = cases.filter((c) => c.kind === "channels") as ChannelsCase[];
/** A golden channel column (`Wall 2`, `Flat edge`) as the app's key. */
function channelKeyOf(col: string): string {
  if (col === "Flat edge") return CHANNEL_FLAT_KEY;
  expect(col).toMatch(/^Wall [1-4]$/);
  return channelWallKey(Number(col.slice("Wall ".length)));
}

/** A board's bottom with the named sections at their starting numbers and channels picked as the store picks them. */
function withChannels(board: BottomBoard, names: Partial<Record<BottomSectionKey, string>>, count: ChannelCount, change?: Partial<BoardBottom["channels"]>): BoardBottom {
  const bottom = bottomOf(board, names);
  bottom.channels = { ...startingChannels(count, board, bottom.channels), ...change };
  return bottom;
}

/**
 * The board as the sketch reads it: its reference rails sampled at the golden's 4,801 stations and read straight
 * between them (the sketch's `sampleArr`). Between two samples — the front fins' station is not one — the sketch's
 * line stands a few millionths of a millimetre off the app's own outline; reading the app's own samples the sketch's
 * way checks the channels' arithmetic to the last digit, and the gap itself is checked on its own below.
 */
function sampledLikeTheSketch(board: BottomBoard): BottomBoard {
  const steps = golden.provenance.stations - 1;
  const sample = (read: (s: Mm) => Mm) => {
    const values = Array.from({ length: steps + 1 }, (_, k) => read(mm((k / steps) * board.length)));
    return (s: Mm) => {
      const x = Math.max(0, Math.min(steps, (s / board.length) * steps));
      const k = Math.min(steps - 1, Math.floor(x));
      return mm(values[k] + (values[k + 1] - values[k]) * (x - k));
    };
  };
  return { ...board, narrowestAt: sample(board.narrowestAt), curveAt: sample(board.curveAt) };
}

describe("the channels — golden: every count, run and length order on the Shortboard and the Fish", () => {
  it("covers the 54 golden channel cases (3 counts × 3 runs × 3 longest × 2 boards)", () => {
    expect(channelsCases).toHaveLength(54);
    expect(new Set(channelsCases.map((c) => `${c.board}|${c.count}|${c.run}|${c.longer}`)).size).toBe(54);
  });

  it("the app reads the rail at the front fins exactly, where the sketch read it straight between its samples: the two agree within a ten-thousandth of a millimetre", () => {
    for (const c of channelsCases) {
      const board = boardById(c.board);
      const ch = resolveBottom(withChannels(board, {}, c.count, { run: c.run, longest: c.longer }), board).channels;
      expect(Math.abs(channelFit(ch, board, "narrowest").offRail - c.fit.offRail)).toBeLessThan(1e-4);
    }
  });

  it.each(channelsCases.map((c) => [c.board, c.count, c.run, c.longer, c] as const))(
    "channels: %s · %d · %s · the %s pair longest — the sketch's makeChannels, channelFit, chStart, and channelEdges and channelMarks every 6\"",
    (_b, count, run, longer, c) => {
      const board = sampledLikeTheSketch(boardById(c.board));
      const bottom = withChannels(board, {}, count, { run, longest: longer });
      const ch = resolveBottom(bottom, board).channels;
      // the starting numbers (D-11), read from the fins (D-03)
      for (const [app, sketch] of [
        [ch.depth, c.ch.depth],
        [ch.width, c.ch.width],
        [ch.offStringer, c.ch.offS],
        [ch.start, c.ch.start],
        [ch.deepest, c.ch.deep],
        [ch.end, c.ch.end],
        [ch.stagger, c.ch.stagger],
      ] as const) {
        expect(Math.abs(app - sketch)).toBeLessThan(TOL);
      }
      expect(ch.smoothness).toBe(c.ch.smooth);
      expect(ch.count).toBe(c.count);
      // the fit at the deepest station
      const fit = channelFit(ch, board, "narrowest");
      expect(fit.perSide).toBe(c.fit.n);
      expect(Math.abs(fit.width - c.fit.w)).toBeLessThan(TOL);
      expect(Math.abs(fit.offRail - c.fit.offRail)).toBeLessThan(TOL);
      expect(fit.squeezed).toBe(c.fit.squeezed);
      // each channel's own start
      expect(c.starts).toHaveLength(count / 2);
      c.starts.forEach((start, j) => expect(Math.abs(channelStart(ch, j) - start)).toBeLessThan(TOL));
      // the edges and the marks every 6"
      for (const g of c.stations) {
        const edges = channelEdges(ch, board, "narrowest", mm(g.s));
        expect(edges.map((e) => e[2])).toEqual(g.edges.map((e) => e[2]));
        edges.forEach(([a, b], k) => {
          expect(Math.abs(a - g.edges[k][0])).toBeLessThan(TOL);
          expect(Math.abs(b - g.edges[k][1])).toBeLessThan(TOL);
        });
        const marks = channelMarks(ch, board, "narrowest", mm(g.s));
        expect(marks.map((m) => [m.column, m.on])).toEqual(g.marks.map((m) => [channelKeyOf(m.col), m.on]));
        marks.forEach((m, k) => expect(Math.abs(m.across - g.marks[k].y)).toBeLessThan(TOL));
        // channelLayout is the same three readings, at the same station
        expect(channelLayout(resolveBottom(bottom, board), board, mm(g.s))).toEqual({ fit, edges, marks });
      }
    },
  );

  it("the cases are not all alike: the three runs lay different walls toward the tail, and the three length orders different starts", () => {
    for (const id of ["shortboard", "fish"]) {
      const at = (run: string, longer: string) => channelsCases.find((c) => c.board === id && c.count === 6 && c.run === run && c.longer === longer)!;
      const tailWalls = (c: ChannelsCase) => JSON.stringify(c.stations[1].edges);
      expect(new Set(["parallel", "rail", "toe"].map((run) => tailWalls(at(run, "outer")))).size).toBe(3);
      expect(new Set(["inner", "outer", "same"].map((longer) => JSON.stringify(at("parallel", longer).starts))).size).toBe(3);
    }
  });
});

describe("the channels in the one number (D-05): the openings with six channels — golden", () => {
  const withSix = (cases.filter((c) => c.kind === "opening") as OpeningWithChannels[]).filter((c) => c.channels === 6);
  const withNone = (id: string) => (cases.filter((c) => c.kind === "opening") as OpeningCase[]).find((c) => c.channels === 0 && c.board === id)!;

  it("covers all five boards", () => {
    expect(withSix.map((c) => c.board)).toEqual(["shortboard", "fish", "midlength", "longboard", "fishwing"]);
  });

  it.each(withSix.map((c) => [c.board, c] as const))("channels: %s's opening cuts plus six channels equal the sketch's foamOff, and the channels alone are the sketch's added term", (_b, c) => {
    const board = boardById(c.board);
    const grid = gridOf(c.board);
    const bottom = withChannels(board, { nose: c.cuts.nose.name, center: c.cuts.center.name, tail: c.cuts.tail.name }, 6);
    const resolved = resolveBottom(bottom, board);
    const none = withNone(c.board);
    let cut = 0;
    grid.s.forEach((s, k) => {
      grid.y[k].forEach((y, j) => {
        expect(Math.abs(foamOff(resolved, board, mm(s), mm(y)) - c.foamOff[k][j])).toBeLessThan(TOL);
        // cut last: the channels add their own term to whatever the sections leave
        const term = channelFoamOff(resolved.channels, board, resolved.wingRule, mm(s), mm(y));
        expect(Math.abs(term - (c.foamOff[k][j] - none.foamOff[k][j]))).toBeLessThan(TOL);
        if (term > 0) cut++;
      });
    });
    expect(cut).toBeGreaterThan(0);
  });

  it.each(withSix.map((c) => [c.board, c] as const))("channels: %s's opening with six channels — the layout columns are the sketch's, the walls after the sections', and every 6\" the cells its marksOf", (_b, c) => {
    const board = boardById(c.board);
    const resolved = resolveBottom(withChannels(board, { nose: c.cuts.nose.name, center: c.cuts.center.name, tail: c.cuts.tail.name }, 6), board);
    const keyOf = (section: string, col: string) => (section === "channels" ? channelKeyOf(col) : keyOfColumn(section as BottomSectionKey, col));
    const goldenKeys = [...BOTTOM_SECTIONS, "channels"].flatMap((section) => (c.columns[section] ?? []).map((col) => keyOf(section, col)));
    const { columns, rows } = bottomLayoutMarks(resolved, board, c.marks.map((m) => mm(m.s)));
    expect(columns.map((col) => col.key)).toEqual(goldenKeys);
    const walls = columns.filter((col) => col.section === "channels");
    expect(walls.map((col) => [col.mark, col.index])).toEqual([1, 2, 3].map((n) => ["wall", n]));
    expect(columns.slice(-3)).toEqual(walls);
    let marked = 0;
    c.marks.forEach((m, k) => {
      columns.forEach((col, j) => {
        const g = (m.marks[col.section] ?? []).find((x) => keyOf(col.section, x.col) === col.key);
        const cell = rows[k].cells[j];
        if (!g) expect(cell).toBeNull();
        else {
          expect(cell).not.toBeNull();
          expect(Math.abs(cell! - g.y)).toBeLessThan(TOL);
          marked++;
        }
      });
    });
    expect(marked).toBeGreaterThan(0);
    // a wall is ruled only from its own channel's start: every 1/2" over the stagger, each wall's cell is empty ahead
    // of its own start and filled behind it — the outer pair is longest (D-11), so the inner walls come on last
    const ch = resolved.channels;
    const half = inchesToMm(1 / 2);
    const stations: Mm[] = [];
    for (let s = ch.start - inchesToMm(6); s < ch.start; s += half) stations.push(mm(s));
    const fine = bottomLayoutMarks(resolved, board, stations);
    let ahead = 0;
    let behind = 0;
    fine.rows.forEach((row) => {
      walls.forEach((col) => {
        const start = channelStart(ch, col.index! - 1);
        const cell = row.cells[fine.columns.findIndex((x) => x.key === col.key)];
        if (row.station >= start) {
          expect(cell, `${col.key} at ${row.station}`).toBeNull();
          ahead++;
        } else if (start - row.station > half && cell !== null) behind++;
      });
    });
    expect(ahead).toBeGreaterThan(0);
    expect(behind).toBeGreaterThan(0);
  });
});

describe("the channels' shape (D-10): the founder's sawtooth", () => {
  const board = boardById("shortboard");
  const ch = resolveChannels(startingChannels(6, board, DEFAULT_BOTTOM.channels), board);
  const s = ch.deepest;
  const edges = channelEdges(ch, board, "narrowest", s);

  it("the stringer is the first peak; each channel deepens out to a wall at the rail side whose top is the next channel's peak", () => {
    expect(edges).toHaveLength(3);
    expect(edges[0][0]).toBe(0);
    // the stringer itself: nothing off it
    expect(channelFoamOff(ch, board, "narrowest", s, mm(0))).toBe(0);
    for (const [a, b, j] of edges) {
      // a peak: next to nothing just outside the channel's inner edge (at the edge itself stands the wall inside it)
      expect(channelFoamOff(ch, board, "narrowest", s, mm(a + 1e-6))).toBeLessThan(1e-4);
      // the floor deepens outward, all the way to the wall
      let last = -1;
      for (let k = 1; k <= 20; k++) {
        const v = channelFoamOff(ch, board, "narrowest", s, mm(a + ((b - a) * k) / 20));
        expect(v).toBeGreaterThan(last);
        last = v;
      }
      // at the wall the full depth (the channels are deepest here, and an inch or wider)
      expect(Math.abs(channelFoamOff(ch, board, "narrowest", s, b) - ch.depth)).toBeLessThan(TOL);
      // and the next channel starts from nothing just outside it: the wall is vertical
      if (j + 1 < edges.length) {
        expect(edges[j + 1][0]).toBe(b);
        expect(channelFoamOff(ch, board, "narrowest", s, mm(b + 1e-6))).toBeLessThan(1e-4);
      }
    }
    // the walls at Width, 2 × Width, 3 × Width from Off Stringer
    edges.forEach(([, b], j) => expect(Math.abs(b - (j + 1) * ch.width)).toBeLessThan(TOL));
    // and nothing outside the last wall
    expect(channelFoamOff(ch, board, "narrowest", s, mm(edges[2][1] + 1))).toBe(0);
  });

  it("Smoothness runs the floor from a straight ramp (0) to a scooped one (100)", () => {
    const scooped = { ...ch, smoothness: 100 };
    const [a, b] = edges[1];
    const mid = mm((a + b) / 2);
    expect(Math.abs(channelFoamOff(ch, board, "narrowest", s, mid) - ch.depth * chan(0.5, 0))).toBeLessThan(TOL);
    expect(Math.abs(channelFoamOff(scooped, board, "narrowest", s, mid) - ch.depth * chan(0.5, 1))).toBeLessThan(TOL);
    expect(channelFoamOff(scooped, board, "narrowest", s, mid)).toBeLessThan(channelFoamOff(ch, board, "narrowest", s, mid));
  });

  it("a channel narrower than an inch shallows out in proportion", () => {
    const narrow = { ...ch, width: inchesToMm(1 / 2) };
    const [, b] = channelEdges(narrow, board, "narrowest", s)[0];
    expect(Math.abs(channelFoamOff(narrow, board, "narrowest", s, b) - narrow.depth * (inchesToMm(1 / 2) / inchesToMm(1)))).toBeLessThan(TOL);
  });

  it("no channels, or none deep, take nothing anywhere", () => {
    for (const none of [{ ...ch, count: 0 as const }, { ...ch, depth: mm(0) }]) {
      for (let k = 0; k <= 20; k++) expect(channelFoamOff(none, board, "narrowest", s, mm(k * 10))).toBe(0);
    }
  });
});

describe("startingChannels (D-10, D-11)", () => {
  const board = boardById("shortboard");

  it("opens D-11's numbers at each count's starting width: 2 1/2\" · 1 3/4\" · 1 1/4\"", () => {
    const widths = { 4: 2.5, 6: 1.75, 8: 1.25 } as const;
    for (const count of [4, 6, 8] as const) {
      const ch = startingChannels(count, board, DEFAULT_BOTTOM.channels);
      expect(ch).toEqual({ ...DEFAULT_BOTTOM.channels, count, width: inchesToMm(widths[count]) });
      expect(CHANNEL_STARTING_WIDTHS[count]).toBe(inchesToMm(widths[count]));
    }
    expect(DEFAULT_BOTTOM.channels.run).toBe("parallel");
    expect(DEFAULT_BOTTOM.channels.longest).toBe("outer");
    expect(DEFAULT_BOTTOM.channels.stagger).toBe(inchesToMm(2));
  });

  it("a width still at a starting width follows the count: 8 channels from 1 3/4\" open at 1 1/4\"", () => {
    const current = { ...DEFAULT_BOTTOM.channels, count: 6 as const, width: inchesToMm(1.75) };
    expect(startingChannels(8, board, current).width).toBe(inchesToMm(1.25));
  });

  it("a width set by hand is kept: 8 channels from 2\" stay at 2\"", () => {
    const current = { ...DEFAULT_BOTTOM.channels, count: 6 as const, width: inchesToMm(2) };
    expect(startingChannels(8, board, current).width).toBe(inchesToMm(2));
  });

  it("has no Wall control and staggers only the starts: the stored set has one deepest station and one end (D-10)", () => {
    expect(Object.keys(DEFAULT_BOTTOM.channels).sort()).toEqual(
      ["count", "width", "offStringer", "startFromFins", "deepestFromFins", "end", "depth", "smoothness", "run", "longest", "stagger"].sort(),
    );
  });

  it("Start and Deepest At ride with the front fins; a fin move past Start pushes Start to it on read and writes nothing back", () => {
    const stored = startingChannels(6, board, DEFAULT_BOTTOM.channels);
    const ch = resolveChannels(stored, board);
    expect(Math.abs(ch.start - (board.frontFins + inchesToMm(12)))).toBeLessThan(TOL);
    expect(ch.deepest).toBe(board.frontFins);
    expect(ch.end).toBe(0);
    const moved = { ...board, frontFins: mm(board.frontFins + inchesToMm(3)) };
    expect(resolveChannels(stored, moved).deepest).toBe(moved.frontFins);
    const past = { ...stored, deepestFromFins: inchesToMm(14) };
    const r = resolveChannels(past, board);
    expect(r.start).toBe(r.deepest);
    expect(past.startFromFins).toBe(inchesToMm(12));
  });
});

describe("the channels' edges of the SPEC (D-10)", () => {
  it("Toe-in on a single fin: the Longboard has no toe, so Toe-in lays the same walls as Parallel", () => {
    const board = boardById("longboard");
    expect(board.toeDegrees).toBe(0);
    const ch = resolveChannels(startingChannels(6, board, DEFAULT_BOTTOM.channels), board);
    const toe = { ...ch, run: "toe" as const };
    for (const s of bottomDataStations(board)) expect(channelEdges(toe, board, "narrowest", s)).toEqual(channelEdges(ch, board, "narrowest", s));
  });

  it("Toe-in splays the set at the front fins' raw toe: inward toward the nose, out toward the tail", () => {
    const board = boardById("shortboard");
    expect(board.toeDegrees).toBeGreaterThan(0);
    const ch = { ...resolveChannels(startingChannels(6, board, DEFAULT_BOTTOM.channels), board), run: "toe" as const };
    const at = (s: number) => channelEdges(ch, board, "narrowest", mm(s));
    const d = inchesToMm(6);
    const tan = Math.tan((board.toeDegrees * Math.PI) / 180);
    expect(Math.abs(at(ch.deepest - d)[0][1] - (ch.width + d * tan))).toBeLessThan(TOL);
    expect(Math.abs(at(ch.deepest + d)[0][1] - (ch.width - d * tan))).toBeLessThan(TOL);
  });

  it("A stagger too long: an 8\" stagger never starts the shortest channel closer than an inch ahead of the deepest station", () => {
    for (const { id, board } of BOARDS) {
      for (const longest of ["inner", "outer"] as const) {
        const ch = resolveChannels({ ...startingChannels(8, board, DEFAULT_BOTTOM.channels), longest, stagger: inchesToMm(8) }, board);
        const starts = [0, 1, 2, 3].map((j) => channelStart(ch, j));
        expect(Math.min(...starts), `${id} · ${longest}`).toBeGreaterThanOrEqual(ch.deepest + CHANNEL_LEAD_IN - TOL);
        // the shortest one does stop exactly there — the stagger would have taken it further
        expect(Math.abs(Math.min(...starts) - (ch.deepest + CHANNEL_LEAD_IN))).toBeLessThan(TOL);
        // and the longest pair still starts at Start
        expect(Math.max(...starts)).toBe(ch.start);
        expect(channelReadout(ch, board, "narrowest").shortestStart).toBe(Math.min(...starts));
      }
    }
  });

  it("A channel set that won't fit inside the rail is squeezed so the last wall leaves 1/2\" to the rail at the deepest station, and says so", () => {
    for (const { id, board } of BOARDS) {
      const ch = resolveChannels({ ...startingChannels(8, board, DEFAULT_BOTTOM.channels), width: inchesToMm(4) }, board);
      const fit = channelFit(ch, board, "narrowest");
      expect(fit.squeezed, id).toBe(true);
      expect(fit.width).toBeLessThan(ch.width);
      const edges = channelEdges(ch, board, "narrowest", ch.deepest);
      const lastWall = edges[edges.length - 1][1];
      expect(Math.abs(refAt(board, "narrowest", ch.deepest) - lastWall - CHANNEL_OFF_RAIL_MIN), id).toBeLessThan(TOL);
      const readout = channelReadout(ch, board, "narrowest");
      expect(readout).toMatchObject({ width: ch.width, fittedWidth: fit.width, squeezed: true });
      expect(Math.abs(readout.lastWallOffRail - CHANNEL_OFF_RAIL_MIN)).toBeLessThan(TOL);
      expect(readout.rampDegrees).toBe(Math.round((Math.atan2(ch.depth, fit.width) * 180) / Math.PI));
      // the opening set fits as asked, and its last wall's distance is read out, never set
      const opening = resolveChannels(startingChannels(8, board, DEFAULT_BOTTOM.channels), board);
      const open = channelReadout(opening, board, "narrowest");
      expect(open.squeezed).toBe(false);
      expect(open.fittedWidth).toBe(opening.width);
      expect(Math.abs(open.lastWallOffRail - (refAt(board, "narrowest", opening.deepest) - 4 * opening.width))).toBeLessThan(TOL);
    }
  });

  it("With the rail keeps the last wall's distance off the rail; where the gaps close the outer channels run out through the rail, never every channel pinched", () => {
    const board = boardById("fish");
    const parallel = resolveChannels(startingChannels(6, board, DEFAULT_BOTTOM.channels), board);
    const rail = { ...parallel, run: "rail" as const };
    const { offRail } = channelFit(rail, board, "narrowest");
    let narrowed = 0;
    for (const s of bottomDataStations(board)) {
      const edges = channelEdges(rail, board, "narrowest", s);
      if (edges.length === 3) {
        expect(Math.abs(refAt(board, "narrowest", s) - edges[2][1] - offRail)).toBeLessThan(TOL);
        if (s < rail.deepest) narrowed++;
      }
      // the channels it keeps are the outer ones' walls more than 1/2 mm off the stringer, never fewer than all
      for (const [, b] of edges) expect(b).toBeGreaterThan(0.5);
    }
    expect(narrowed).toBeGreaterThan(0);
    // Parallel rules the walls straight: toward the tail the outer walls stand past the rail, so those channels run out
    const atTail = channelEdges(parallel, board, "narrowest", mm(0));
    expect(atTail.length).toBe(3);
    expect(atTail[2][1]).toBeGreaterThan(board.railAt(mm(0)));
  });
});

describe("the channels take the same foam under any center cut (SPEC: overlapping cuts, the channels' half; D-05)", () => {
  it("the channels' litres on the Shortboard under a Deep Single, a shallower single and a Flat Center agree within 1%", () => {
    const { fields } = FIELDS.find((f) => f.id === "shortboard")!;
    const board = bottomBoardOf(fields);
    const litresOf = (bottom: BoardBottom) => summarizeDesign({ ...fields, bottom }).volumeLitres;
    const deep = bottomOf(board, { center: "Deep Single Concave" });
    const shallower = bottomOf(board, { center: "Deep Single Concave" });
    shallower.center = { ...shallower.center, depth: inchesToMm(1 / 8) };
    const flat = bottomOf(board, {});
    const takes = [deep, shallower, flat].map((b) => {
      const withSix = structuredClone(b);
      withSix.channels = startingChannels(6, board, b.channels);
      // a flat bottom alone cuts nothing, so it is never handed to the litres: its litres are the board's own
      return litresOf(b) - litresOf(withSix);
    });
    console.info(`six channels on the Shortboard take ${takes.map((t) => t.toFixed(4)).join(" / ")} L under a Deep Single, a 1/8" single and a Flat Center`);
    for (const t of takes) {
      expect(t).toBeGreaterThan(0);
      expect(Math.abs(t / takes[2] - 1)).toBeLessThan(0.01);
    }
  });
});

describe("the channels in DATA's floor (D-09, D-40)", () => {
  it("channels never meet the stringer floor; eight at 1/2\" out the tail thin the tail rail and are flagged in the rail form, nearest the tail", () => {
    const { fields } = FIELDS.find((f) => f.id === "shortboard")!;
    const board = bottomBoardOf(fields);
    const bottom = withChannels(board, {}, 8, { depth: inchesToMm(1 / 2) });
    const resolved = resolveBottom(bottom, board);
    // each channel's floor starts at a peak: nothing off the stringer, anywhere
    for (const s of bottomDataStations(board)) expect(channelFoamOff(resolved.channels, board, "narrowest", s, mm(0))).toBe(0);
    const sections = sectionsOf(fields, bottom);
    const flags = bottomFloorFlags(resolved, board, sections);
    expect(flags.map((f) => f.section)).toEqual(["channels"]);
    const [flag] = flags;
    expect(flag.stringer).toEqual([]);
    expect(flag.rails.length).toBeGreaterThan(0);
    for (const s of flag.rails) {
      expect(s).toBeLessThanOrEqual(resolved.channels.start);
      expect(sections.find((x) => x.station === s)!.thinAt!.length).toBeGreaterThan(0);
    }
    expect(flag.at).toBe(Math.min(...flag.rails));
  }, 120_000);
});

describe("the channels' own edits on the panel (17-09): the count switch, the stations stored and kept in order", () => {
  const board = boardById("shortboard");
  const COUNTS = [4, 6, 8] as const;

  it("a board that never had channels opens each count exactly on startingChannels", () => {
    for (const count of COUNTS) expect(switchChannelCount(DEFAULT_BOTTOM.channels, count, board)).toEqual(startingChannels(count, board, DEFAULT_BOTTOM.channels));
  });

  it("on an open set a count brings its own starting width and keeps every other number; a width set by hand stays", () => {
    const tuned = { ...switchChannelCount(DEFAULT_BOTTOM.channels, 6, board), depth: inchesToMm(1 / 4), stagger: inchesToMm(3), run: "rail" as const };
    for (const count of COUNTS) expect(switchChannelCount(tuned, count, board)).toEqual({ ...tuned, count, width: CHANNEL_STARTING_WIDTHS[count] });
    const handSet = { ...tuned, width: inchesToMm(2) };
    for (const count of COUNTS) expect(switchChannelCount(handSet, count, board)).toEqual({ ...handSet, count });
  });

  it("None hides the set and keeps every number; the next count opens on them again", () => {
    const tuned = { ...switchChannelCount(DEFAULT_BOTTOM.channels, 8, board), width: inchesToMm(2), depth: inchesToMm(3 / 16), longest: "same" as const };
    const none = switchChannelCount(tuned, 0, board);
    expect(none).toEqual({ ...tuned, count: 0 });
    expect(switchChannelCount(none, 8, board)).toEqual(tuned);
  });

  it("a station dragged on the panel is stored from the fins (Start, Deepest At) or the tail (End), and reads back where it was dragged", () => {
    const set = switchChannelCount(DEFAULT_BOTTOM.channels, 6, board);
    const r = resolveChannels(set, board);
    const to = { start: mm(r.start + inchesToMm(2)), deepest: mm(r.deepest + inchesToMm(1)), end: mm(r.end + inchesToMm(1 / 2)) };
    for (const field of ["start", "deepest", "end"] as const) {
      const moved = resolveChannels({ ...set, ...storeChannelStation(field, to[field], board) }, board);
      expect(moved[field]).toBeCloseTo(to[field], 9);
    }
  });

  it("Start ≥ Deepest ≥ End is kept the way a cut's are: the moved station wins (a Center cut's keepStationsInOrder, the same drag)", () => {
    const set = switchChannelCount(DEFAULT_BOTTOM.channels, 6, board);
    const r = resolveChannels(set, board);
    const center = startingCut("center", "Deep Single Concave", board);
    const drags: [field: "start" | "deepest" | "end", fromTail: Mm][] = [
      ["start", mm(board.frontFins - inchesToMm(4))],
      ["end", mm(board.frontFins + inchesToMm(6))],
      ["deepest", mm(board.frontFins + inchesToMm(20))],
      ["deepest", inchesToMm(1)],
    ];
    for (const [field, fromTail] of drags) {
      const kept = resolveChannels(keepChannelStationsInOrder({ ...set, ...storeChannelStation(field, fromTail, board) }, field, board), board);
      const cut = keepStationsInOrder("center", { ...center, start: r.start, deepest: r.deepest, end: r.end, [field]: fromTail }, field, board, "narrowest");
      expect(kept.start).toBeCloseTo(cut.start, 9);
      expect(kept.deepest).toBeCloseTo(cut.deepest, 9);
      expect(kept.end).toBeCloseTo(cut.end, 9);
      expect(kept.start).toBeGreaterThanOrEqual(kept.deepest);
      expect(kept.deepest).toBeGreaterThanOrEqual(kept.end);
      expect(kept[field]).toBeCloseTo(fromTail, 9);
    }
  });
});
