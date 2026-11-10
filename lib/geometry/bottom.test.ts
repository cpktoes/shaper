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
  BOTTOM_MARK_FADE_MIN,
  bottomSampler,
  chan,
  CHANNEL_EDGE_MIN,
  CHANNEL_FLAT_KEY,
  CHANNEL_LEAD_IN,
  CHANNEL_OFF_RAIL_MIN,
  CHANNEL_PINCH,
  CHANNEL_RAIL_EASE,
  CHANNEL_STARTING_WIDTHS,
  channelEdges,
  channelFit,
  channelFoamOff,
  channelLayout,
  channelMarks,
  channelRailWidth,
  channelReadout,
  channelStart,
  channelWallKey,
  channelWallsAt,
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
/** Every eighth of an inch from the tail to the channels' Start, and Start itself. */
function stationsToStart(start: Mm): Mm[] {
  const step = inchesToMm(1 / 8);
  const out: Mm[] = [];
  for (let k = 0; k * step < start; k++) out.push(mm(k * step));
  out.push(start);
  return out;
}

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
      let asTheSketch = 0;
      let heldOpen = 0;
      for (const g of c.stations) {
        const edges = channelEdges(ch, board, "narrowest", mm(g.s));
        const marks = channelMarks(ch, board, "narrowest", mm(g.s));
        /** The sketch's own walls and marks, to the last digit. */
        const exactlyTheSketch = () => {
          expect(edges.map((e) => e[2])).toEqual(g.edges.map((e) => e[2]));
          edges.forEach(([a, b], k) => {
            expect(Math.abs(a - g.edges[k][0])).toBeLessThan(TOL);
            expect(Math.abs(b - g.edges[k][1])).toBeLessThan(TOL);
          });
          expect(marks.map((m) => [m.column, m.on])).toEqual(g.marks.map((m) => [channelKeyOf(m.col), m.on]));
          marks.forEach((m, k) => expect(Math.abs(m.across - g.marks[k].y)).toBeLessThan(TOL));
        };
        if (run !== "rail") exactlyTheSketch();
        else {
          /*
           * With the rail, the app departs from the sketch on the founder's word (his ruling on the code review's
           * WR-02, 2026-11-10): "the channels with the rail shoud never bunch at the tip. the early wording was
           * correct. They either are straight, or splay in (toe in with the fins) or out (following the rail line) but
           * never meet at a single point." The sketch narrowed every channel with the rail down to nothing; the app
           * follows the rail only down to an inch a channel and runs straight from there (`channelRailWidth`).
           *
           * So the golden holds the app through that rule, as a relation: at each recorded station every channel is
           * `channelRailWidth(the sketch's width there, the fitted Width)` wide, the walls ruled from it. Where the
           * rule gives the sketch's own width back — wherever the rail leaves a channel 1/2" more than an inch — the
           * walls and the marks are still the sketch's, to the last digit.
           */
          // the sketch's width there: any channel it recorded (they abut, all one width, and no golden set is off the
          // stringer). Where it recorded none every wall was within 1/2 mm of the stringer — a width the rule answers
          // exactly as it answers nothing at all.
          expect(ch.offStringer).toBe(0);
          expect(channelRailWidth(CHANNEL_EDGE_MIN, fit.width)).toBe(channelRailWidth(mm(0), fit.width));
          const sketchWidth = g.edges.length ? g.edges[0][1] - g.edges[0][0] : 0;
          const width = channelRailWidth(mm(sketchWidth), fit.width);
          // every channel is there, abutting from the stringer at that width
          expect(edges.map((e) => e[2])).toEqual(Array.from({ length: fit.perSide }, (_, k) => k));
          edges.forEach(([a, b], k) => {
            expect(Math.abs(a - k * width)).toBeLessThan(TOL);
            expect(Math.abs(b - (k + 1) * width)).toBeLessThan(TOL);
          });
          // the marks follow the walls: one a wall, on from its own channel's start — the sketch's own answer for every
          // wall the sketch ruled, and the same rule (the channel's fade) for a wall the sketch had lost at the stringer
          expect(marks.map((m) => m.column)).toEqual(edges.map((e) => channelWallKey(e[2] + 1)));
          marks.forEach((m, k) => {
            expect(m.across).toBe(edges[k][1]);
            expect(m.on).toBe(fadeAt(channelStart(ch, k), ch.deepest, ch.end, g.s, board.length) > BOTTOM_MARK_FADE_MIN);
            const sketched = g.marks.find((q) => channelKeyOf(q.col) === m.column);
            if (sketched) expect(m.on).toBe(sketched.on);
          });
          if (width === sketchWidth) {
            asTheSketch++;
            exactlyTheSketch();
          } else {
            heldOpen++;
            // the departure only ever widens a channel, and never past an inch and the ease's small bulge
            expect(width).toBeGreaterThan(sketchWidth);
            expect(width).toBeLessThan(CHANNEL_PINCH + CHANNEL_RAIL_EASE);
          }
        }
        // channelLayout is the same three readings, at the same station
        expect(channelLayout(resolveBottom(bottom, board), board, mm(g.s))).toEqual({ fit, edges, marks });
      }
      // With the rail: both kinds of station are in every case — the sketch's own walls where the board is wide, the
      // founder's inch toward a tip
      if (run === "rail") {
        expect(asTheSketch).toBeGreaterThan(0);
        expect(heldOpen).toBeGreaterThan(0);
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

/* ============ the founder's ruling on the code review's WR-02 (2026-11-10): With the rail never bunches ============ */

describe("channelRailWidth: With the rail follows the rail down to an inch a channel, then runs straight (the founder's ruling on WR-02; D-10)", () => {
  /** The set's Widths to try: the three starting Widths, every 1/16" from 1/4" to 3", and one that is no round figure. */
  const SET_WIDTHS: Mm[] = [...Object.values(CHANNEL_STARTING_WIDTHS), ...Array.from({ length: 45 }, (_, k) => inchesToMm(1 / 4 + k / 16)), mm(31.337)];
  /** What following the rail could leave a channel: every 1/64" from nothing to 4". */
  const FOLLOWED: Mm[] = Array.from({ length: 257 }, (_, k) => inchesToMm(k / 64));
  /** The narrowest a channel of the set gets, and how far either side of it the narrowing eases in. */
  const narrowestOf = (set: Mm) => Math.min(set, CHANNEL_PINCH);
  const easeOf = (set: Mm) => Math.min(CHANNEL_RAIL_EASE, set - narrowestOf(set));

  it("the narrowest is the inch a channel shallows under, and the ease is half of it", () => {
    expect(CHANNEL_PINCH).toBe(inchesToMm(1));
    expect(CHANNEL_RAIL_EASE).toBe(CHANNEL_PINCH / 2);
  });

  it("a channel the rail leaves the ease or more wider than its narrowest is exactly as wide as the rail leaves it", () => {
    let checked = 0;
    for (const set of SET_WIDTHS) {
      const [narrowest, ease] = [narrowestOf(set), easeOf(set)];
      for (const followed of [...FOLLOWED, set]) {
        if (!(followed - narrowest >= ease)) continue;
        checked++;
        expect(channelRailWidth(followed, set)).toBe(followed);
      }
      // and at the join itself, however the join's own arithmetic rounds
      expect(Math.abs(channelRailWidth(mm(narrowest + ease), set) - (narrowest + ease))).toBeLessThan(TOL);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("a channel the rail would leave the ease or more under its narrowest — down to nothing at all — is its narrowest, exactly", () => {
    for (const set of SET_WIDTHS) {
      const [narrowest, ease] = [narrowestOf(set), easeOf(set)];
      expect(channelRailWidth(mm(0), set)).toBe(narrowest);
      for (const followed of FOLLOWED) {
        if (followed - narrowest <= -ease) expect(channelRailWidth(followed, set)).toBe(narrowest);
      }
      expect(Math.abs(channelRailWidth(mm(narrowest - ease), set) - narrowest)).toBeLessThan(TOL);
    }
  });

  it("never narrower than its narrowest, never narrower than the rail leaves it, and never more than a quarter of the ease over the wider of the two", () => {
    for (const set of SET_WIDTHS) {
      const [narrowest, ease] = [narrowestOf(set), easeOf(set)];
      for (const followed of FOLLOWED) {
        const width = channelRailWidth(followed, set);
        expect(width).toBeGreaterThanOrEqual(narrowest);
        expect(width).toBeGreaterThanOrEqual(followed - TOL);
        expect(width).toBeLessThanOrEqual(Math.max(followed, narrowest) + ease / 4 + TOL);
      }
    }
  });

  it("it never runs backward and never changes faster than the rail does: a wider rail never makes a narrower channel", () => {
    for (const set of SET_WIDTHS) {
      for (let k = 1; k < FOLLOWED.length; k++) {
        const step = channelRailWidth(FOLLOWED[k], set) - channelRailWidth(FOLLOWED[k - 1], set);
        expect(step).toBeGreaterThanOrEqual(-TOL);
        expect(step).toBeLessThanOrEqual(FOLLOWED[k] - FOLLOWED[k - 1] + TOL);
      }
    }
  });

  it("no step and no corner where it leaves the rail or where it reaches its narrowest: the width and its slope both meet at each join", () => {
    const h = 1e-4;
    let eased = 0;
    for (const set of SET_WIDTHS) {
      const [narrowest, ease] = [narrowestOf(set), easeOf(set)];
      if (!(ease > 0)) continue;
      eased++;
      const at = (followed: number) => channelRailWidth(mm(followed), set);
      const slope = (from: number, to: number) => (at(to) - at(from)) / (to - from);
      const [leaves, reaches] = [narrowest + ease, narrowest - ease];
      // where it leaves the rail: the rail's own width, and the rail's own slope (1) from both sides
      expect(Math.abs(at(leaves) - leaves)).toBeLessThan(TOL);
      expect(Math.abs(slope(leaves, leaves + h) - 1)).toBeLessThan(1e-3);
      expect(Math.abs(slope(leaves - h, leaves) - 1)).toBeLessThan(1e-3);
      // where it reaches its narrowest: that width, and level (0) from both sides
      expect(Math.abs(at(reaches) - narrowest)).toBeLessThan(TOL);
      expect(Math.abs(slope(reaches, reaches + h))).toBeLessThan(1e-3);
      expect(Math.abs(slope(reaches - h, reaches))).toBeLessThan(1e-3);
      // and between the joins it is a bend, not a line: halfway it stands a quarter of the ease over its narrowest
      expect(Math.abs(at(narrowest) - (narrowest + ease / 4))).toBeLessThan(TOL);
    }
    expect(eased).toBeGreaterThan(0);
  });

  it("a Width of an inch or under has no room to ease: the channels simply stop narrowing at the set's own Width", () => {
    let checked = 0;
    for (const set of SET_WIDTHS.filter((w) => w <= CHANNEL_PINCH)) {
      checked++;
      for (const followed of FOLLOWED) expect(channelRailWidth(followed, set)).toBe(Math.max(followed, set));
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("at the deepest station it is the fitted Width exactly: all five boards, 4, 6 and 8 channels, as asked, squeezed and narrow", () => {
    for (const { id, board } of BOARDS) {
      for (const count of [4, 6, 8] as const) {
        for (const width of [CHANNEL_STARTING_WIDTHS[count], inchesToMm(4), inchesToMm(3 / 4)]) {
          const parallel = resolveChannels({ ...startingChannels(count, board, DEFAULT_BOTTOM.channels), width }, board);
          const rail = { ...parallel, run: "rail" as const };
          const fit = channelFit(rail, board, "narrowest");
          const name = `${id} · ${count} · ${formatInchesFraction(width)}`;
          expect(fit.width, name).toBeGreaterThan(0);
          expect(channelRailWidth(fit.width, fit.width), name).toBe(fit.width);
          // and so the set is the Parallel set there, wall for wall: Width is still the width at the deepest station
          const edges = channelEdges(rail, board, "narrowest", rail.deepest);
          const straight = channelEdges(parallel, board, "narrowest", rail.deepest);
          expect(edges.length, name).toBe(fit.perSide);
          expect(straight.length, name).toBe(fit.perSide);
          edges.forEach(([a, b, j], k) => {
            expect(j).toBe(straight[k][2]);
            expect(Math.abs(b - a - fit.width), name).toBeLessThan(TOL);
            expect(Math.abs(a - straight[k][0]), name).toBeLessThan(TOL);
            expect(Math.abs(b - straight[k][1]), name).toBeLessThan(TOL);
          });
        }
      }
    }
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

  it("With the rail keeps the last wall's distance off the rail only while that leaves every channel real width: from an inch a channel the walls run straight to the tail and the outer ones run out through the rail, never every channel pinched (D-10; the founder's ruling on WR-02)", () => {
    for (const id of ["shortboard", "midlength", "fish"]) {
      const board = boardById(id);
      for (const count of [4, 6, 8] as const) {
        const name = `${id} · ${count}`;
        const rail = { ...resolveChannels(startingChannels(count, board, DEFAULT_BOTTOM.channels), board), run: "rail" as const };
        const { perSide, width, offRail } = channelFit(rail, board, "narrowest");
        const narrowest = Math.min(width, CHANNEL_PINCH);
        const ease = Math.min(CHANNEL_RAIL_EASE, width - narrowest);
        const widthAt = (s: Mm) => {
          const edges = channelEdges(rail, board, "narrowest", s);
          // every channel of the set, at every station: none is lost and none has closed
          expect(edges.map((e) => e[2]), `${name} at ${s}`).toEqual(Array.from({ length: perSide }, (_, k) => k));
          const each = edges[0][1] - edges[0][0];
          edges.forEach(([a, b], k) => {
            expect(b - a, `${name} at ${s}`).toBeGreaterThanOrEqual(narrowest - TOL);
            // abutting, all one width: no two walls ever meet
            expect(Math.abs(a - k * each)).toBeLessThan(TOL);
            expect(Math.abs(b - (k + 1) * each)).toBeLessThan(TOL);
          });
          return { each, lastWall: edges[perSide - 1][1] };
        };
        let [onTheRail, narrowedOnTheRail, straight] = [0, 0, 0];
        let before: { ref: number; each: number } | null = null;
        for (const s of stationsToStart(rail.start)) {
          const ref = refAt(board, "narrowest", s);
          const { each, lastWall } = widthAt(s);
          const followed = Math.max(0, ref - offRail - rail.offStringer) / perSide;
          expect(each, `${name} at ${s}`).toBeGreaterThanOrEqual(followed - TOL);
          if (followed - narrowest >= ease) {
            // the set has not reached the ease: the last wall keeps its distance off the rail
            onTheRail++;
            if (s < rail.deepest) narrowedOnTheRail++;
            expect(Math.abs(ref - lastWall - offRail), `${name} at ${s}`).toBeLessThan(TOL);
          } else if (followed - narrowest <= -ease) {
            // past the ease: an inch a channel (or the set's own Width), the walls straight
            straight++;
            expect(each, `${name} at ${s}`).toBe(narrowest);
          }
          // the width never jumps: from one 1/8" station to the next it moves no more than the rail itself does
          if (before) expect(Math.abs(each - before.each), `${name} at ${s}`).toBeLessThanOrEqual(Math.abs(ref - before.ref) / perSide + TOL);
          before = { ref, each };
        }
        expect(onTheRail, name).toBeGreaterThan(0);
        // a set more than the ease wider than its narrowest does narrow with the rail behind the deepest station first
        if (width - narrowest > CHANNEL_RAIL_EASE) expect(narrowedOnTheRail, name).toBeGreaterThan(0);
        const tail = widthAt(mm(0));
        if (id === "fish") {
          // the Fish's wide tail never closes the set that far: its last wall is still inside the rail at the tail
          expect(tail.lastWall, name).toBeLessThan(board.railAt(mm(0)));
        } else {
          // the Shortboard and the Midlength do: the walls run straight, an inch apart, out the tail
          expect(straight, name).toBeGreaterThan(0);
          expect(tail.each, name).toBe(narrowest);
          expect(narrowest, name).toBe(CHANNEL_PINCH);
          // and the outer wall stands past the rail there — the outer channel has run out through it. (Four channels
          // an inch wide put their outer wall 2" out, which is the Shortboard's own tail corner, so six and eight.)
          if (count > 4 || id === "midlength") expect(tail.lastWall, name).toBeGreaterThan(board.railAt(mm(0)));
          else expect(tail.lastWall, name).toBeGreaterThanOrEqual(board.railAt(mm(0)) - TOL);
        }
      }
    }
    // the Fish's six, where the tail leaves each channel a little over an inch: eased, neither the rail's width nor the inch
    const fish = boardById("fish");
    const parallel = resolveChannels(startingChannels(6, fish, DEFAULT_BOTTOM.channels), fish);
    const rail = { ...parallel, run: "rail" as const };
    const fit = channelFit(rail, fish, "narrowest");
    const followedAtTail = (refAt(fish, "narrowest", mm(0)) - fit.offRail) / fit.perSide;
    const [first] = channelEdges(rail, fish, "narrowest", mm(0));
    expect(first[1] - first[0]).toBeGreaterThan(followedAtTail + TOL);
    expect(first[1] - first[0]).toBeGreaterThan(CHANNEL_PINCH + TOL);
    expect(first[1] - first[0]).toBeLessThan(CHANNEL_PINCH + CHANNEL_RAIL_EASE);
    // Parallel rules the walls straight: toward the tail the outer walls stand past the rail, so those channels run out
    const atTail = channelEdges(parallel, fish, "narrowest", mm(0));
    expect(atTail.length).toBe(3);
    expect(atTail[2][1]).toBeGreaterThan(fish.railAt(mm(0)));
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

/* ============ the code review's CR-01 (2026-11-10): With the rail, a flat by the stringer, and a narrow tail ============ */

/*
 * CR-01 found the litres, the 3D tail and the CNC files thrown where the tail is narrower than the flat and the last
 * wall's keep together: With the rail had no room left for the set there. Its first fix laid no channels at such a
 * station. The founder's ruling on WR-02 the same day changes what is true there — the set no longer follows the rail
 * down to nothing, so it is never without room: it keeps its narrowest width and runs straight from the flat's edge,
 * and whatever of it stands outboard of the rail cuts nothing. These tests hold that, and that every number stays finite.
 */

describe("CR-01: With-the-rail channels and an Off Stringer, where the tail is narrower than the flat and the last wall's keep", () => {
  const OFF = inchesToMm(1 / 2);
  /** The review's three sets and the two stock boards it did not name: board, channels, Width in inches. */
  const SETS: [id: string, count: ChannelCount, widthInches: number][] = [
    ["midlength", 6, 1],
    ["shortboard", 8, 3 / 4],
    ["shortboard", 6, 1],
    ["longboard", 4, 3 / 4],
    ["fish", 4, 3 / 4],
  ];
  const nameOf = (id: string, count: number, widthInches: number) => `${id} · ${count} channels ${formatInchesFraction(inchesToMm(widthInches))} wide`;
  /** A stock board with a set laid With the rail, this far off the stringer. */
  const setOf = (id: string, count: ChannelCount, widthInches: number, offStringer: Mm) => {
    const { fields } = FIELDS.find((f) => f.id === id)!;
    const board = boardById(id);
    const bottom = withChannels(board, {}, count, { run: "rail", width: inchesToMm(widthInches), offStringer });
    const resolved = resolveBottom(bottom, board);
    return { fields, board, bottom, resolved, ch: resolved.channels, rule: resolved.wingRule };
  };
  /** The room With the rail leaves the whole set at a station: the rail, less the last wall's keep, less the flat. */
  const roomAt = (set: ReturnType<typeof setOf>, s: Mm) => refAt(set.board, set.rule, s) - channelFit(set.ch, set.board, set.rule).offRail - set.ch.offStringer;

  it("the tail does get that narrow on every one of them, and there the set stops following the rail: every channel keeps its narrowest width, ruled straight from the flat's edge — never a channel of no width, and never no channels", () => {
    for (const [id, count, widthInches] of SETS) {
      const set = setOf(id, count, widthInches, OFF);
      const name = nameOf(id, count, widthInches);
      const { perSide, width } = channelFit(set.ch, set.board, set.rule);
      const narrowest = Math.min(width, CHANNEL_PINCH);
      let [noRoom, outboard] = [0, 0];
      for (const s of stationsToStart(set.ch.start)) {
        const edges = channelEdges(set.ch, set.board, set.rule, s);
        expect(edges.map((e) => e[2]), `${name} at ${s}`).toEqual(Array.from({ length: perSide }, (_, k) => k));
        for (const [a, b] of edges) expect(b - a, `${name} at ${s}`).toBeGreaterThanOrEqual(narrowest - TOL);
        // the litres' walls: one per channel a side as always, each where its channel's wall stands
        expect(channelWallsAt(set.ch, set.board, set.rule, s), `${name} at ${s}`).toEqual(edges.map(([, b]) => b));
        if (roomAt(set, s) <= 0) {
          noRoom++;
          edges.forEach(([a, b], k) => {
            expect(Math.abs(a - (set.ch.offStringer + k * narrowest)), `${name} at ${s}`).toBeLessThan(TOL);
            expect(Math.abs(b - (set.ch.offStringer + (k + 1) * narrowest)), `${name} at ${s}`).toBeLessThan(TOL);
          });
          // the marks: the flat's edge on the Off Stringer line, then every wall
          const marks = channelMarks(set.ch, set.board, set.rule, s);
          expect(marks.map((m) => m.column), `${name} at ${s}`).toEqual([CHANNEL_FLAT_KEY, ...edges.map((e) => channelWallKey(e[2] + 1))]);
          expect(marks.map((m) => m.across), `${name} at ${s}`).toEqual([edges[0][0], ...edges.map(([, b]) => b)]);
        }
        const rail = set.board.railAt(s);
        if (rail <= set.ch.offStringer) {
          // the flat alone is wider than the tail here: the whole set stands outboard of the rail and cuts nothing
          outboard++;
          for (const [a] of edges) expect(a, `${name} at ${s}`).toBeGreaterThanOrEqual(rail);
          for (let k = 0; k <= 48; k++) expect(channelFoamOff(set.ch, set.board, set.rule, s, mm((rail * k) / 48)), `${name} at ${s}`).toBe(0);
        }
      }
      expect(noRoom, name).toBeGreaterThan(0);
      // the Midlength's round pin closes to nothing, so there the flat does stand wider than the tail
      if (id === "midlength") expect(outboard, name).toBeGreaterThan(0);
    }
  });

  it("the set is ruled abutting from the flat's edge at channelRailWidth's width at every station: on the rail — the last wall keeping its distance off it — while that leaves the ease over the narrowest, and held wider than the rail would leave it from there", () => {
    // the review's sets, an inch wide and under (no ease), and the same boards at their starting Widths (eased)
    const stock: typeof SETS = SETS.map(([id, count]) => [id, count, CHANNEL_STARTING_WIDTHS[count] / inchesToMm(1)]);
    for (const [id, count, widthInches] of [...SETS, ...stock]) {
      const set = setOf(id, count, widthInches, OFF);
      const name = nameOf(id, count, widthInches);
      const { perSide, width, offRail } = channelFit(set.ch, set.board, set.rule);
      const narrowest = Math.min(width, CHANNEL_PINCH);
      const ease = Math.min(CHANNEL_RAIL_EASE, width - narrowest);
      let [onTheRail, held] = [0, 0];
      for (const s of stationsToStart(set.ch.start)) {
        const followed = mm(Math.max(0, roomAt(set, s)) / perSide);
        const each = channelRailWidth(followed, width);
        const edges = channelEdges(set.ch, set.board, set.rule, s);
        expect(edges.length, `${name} at ${s}`).toBe(perSide);
        edges.forEach(([a, b, j], k) => {
          expect(j).toBe(k);
          expect(Math.abs(a - (set.ch.offStringer + k * each))).toBeLessThan(TOL);
          expect(Math.abs(b - (set.ch.offStringer + (k + 1) * each))).toBeLessThan(TOL);
        });
        const offTheRail = refAt(set.board, set.rule, s) - edges[perSide - 1][1];
        if (followed - narrowest >= ease) {
          onTheRail++;
          expect(each, `${name} at ${s}`).toBe(followed);
          expect(Math.abs(offTheRail - offRail), `${name} at ${s}`).toBeLessThan(TOL);
        } else {
          held++;
          expect(each, `${name} at ${s}`).toBeGreaterThanOrEqual(followed);
          // the last wall has come closer to the rail than its keep — or has run out through it
          expect(offTheRail, `${name} at ${s}`).toBeLessThanOrEqual(offRail + TOL);
        }
      }
      expect(onTheRail, name).toBeGreaterThan(0);
      expect(held, name).toBeGreaterThan(0);
    }
  });

  it("a set an inch wide or under laid With the rail is the Parallel set, wall for wall, from the deepest station back to the tail: it only follows the rail ahead of it, where the board is wider", () => {
    for (const [id, count, widthInches] of SETS) {
      for (const off of [mm(0), OFF]) {
        const set = setOf(id, count, widthInches, off);
        const name = nameOf(id, count, widthInches);
        const parallel = { ...set.ch, run: "parallel" as const };
        const { width } = channelFit(set.ch, set.board, set.rule);
        expect(width, name).toBeLessThanOrEqual(CHANNEL_PINCH);
        let [same, wider] = [0, 0];
        for (const s of stationsToStart(set.ch.start)) {
          const edges = channelEdges(set.ch, set.board, set.rule, s);
          const straight = channelEdges(parallel, set.board, set.rule, s);
          expect(edges.length, `${name} at ${s}`).toBe(straight.length);
          if (s <= set.ch.deepest) {
            same++;
            edges.forEach(([a, b], k) => {
              expect(Math.abs(a - straight[k][0]), `${name} at ${s}`).toBeLessThan(TOL);
              expect(Math.abs(b - straight[k][1]), `${name} at ${s}`).toBeLessThan(TOL);
            });
          } else if (edges[edges.length - 1][1] > straight[straight.length - 1][1] + TOL) wider++;
        }
        expect(same, name).toBeGreaterThan(0);
        expect(wider, name).toBeGreaterThan(0);
      }
    }
  });

  it("the foam off is a finite number, never under nothing and never over the channels' depth, at every wall, on the flat's edge and across every station from the tail to Start", () => {
    for (const [id, count, widthInches] of SETS) {
      const set = setOf(id, count, widthInches, OFF);
      const name = nameOf(id, count, widthInches);
      const sampler = bottomSampler(set.resolved, set.board);
      let cut = 0;
      for (const s of stationsToStart(set.ch.start)) {
        const rail = set.board.railAt(s);
        const across: number[] = [set.ch.offStringer, ...channelWallsAt(set.ch, set.board, set.rule, s)];
        for (const [a, b] of channelEdges(set.ch, set.board, set.rule, s)) across.push(a, b, (a + b) / 2);
        for (let k = 0; k <= 48; k++) across.push((rail * k) / 48);
        for (const y of across) {
          const channels = channelFoamOff(set.ch, set.board, set.rule, s, mm(y));
          expect(Number.isFinite(channels), `${name}: the channels at ${s}, ${y} across`).toBe(true);
          expect(channels).toBeGreaterThanOrEqual(0);
          expect(channels).toBeLessThanOrEqual(set.ch.depth + TOL);
          expect(Number.isFinite(foamOff(set.resolved, set.board, s, mm(y))), `${name}: the one number at ${s}, ${y} across`).toBe(true);
          expect(Number.isFinite(sampler(s, mm(y))), `${name}: the litres' reading at ${s}, ${y} across`).toBe(true);
          if (channels > 0) cut++;
        }
      }
      // and the set is still there to be cut: this is not a board whose channels went missing
      expect(cut, name).toBeGreaterThan(0);
    }
  });

  it("the litres, the 3D board and the CNC files: every section is finite, a section of these sets (each an inch wide or under) ends its foam only where the same set laid Parallel ends it, and 1/2\" of Off Stringer moves the foam off by no more than a few hundredths of a litre", () => {
    for (const [id, count, widthInches] of SETS) {
      const name = nameOf(id, count, widthInches);
      const onStringer = setOf(id, count, widthInches, mm(0));
      const offStringer = setOf(id, count, widthInches, OFF);
      const knifeEdges = (fields: DesignSummaryFields, bottom: BoardBottom) => {
        const sections = sectionsOf(fields, bottom);
        for (const section of sections) {
          expect(Number.isFinite(section.area), `${name}: the section at ${section.station}`).toBe(true);
          for (const [y, h] of section.drawn ?? []) expect(Number.isFinite(y) && Number.isFinite(h), `${name}: the section at ${section.station}`).toBe(true);
        }
        return sections.filter((section) => section.railEdgeAt !== undefined).map((section) => section.station);
      };
      // Behind the deepest station these sets are the Parallel sets wall for wall (the test above), and ahead of it
      // the board is thick: so With the rail ends a section's foam at the very stations Parallel does, no others.
      for (const set of [onStringer, offStringer]) {
        const parallel: BoardBottom = { ...set.bottom, channels: { ...set.bottom.channels, run: "parallel" } };
        expect(knifeEdges(set.fields, set.bottom), name).toEqual(knifeEdges(set.fields, parallel));
      }
      const plain = summarizeDesign(onStringer.fields).volumeLitres;
      const took = (set: ReturnType<typeof setOf>) => plain - summarizeDesign({ ...set.fields, bottom: set.bottom }).volumeLitres;
      const [takenOn, takenOff] = [took(onStringer), took(offStringer)];
      console.info(`${name}, With the rail: ${takenOn.toFixed(4)} L off on the stringer, ${takenOff.toFixed(4)} L with a 1/2" flat`);
      expect(takenOn, name).toBeGreaterThan(0);
      expect(takenOff, name).toBeGreaterThan(0);
      expect(Math.abs(takenOff - takenOn), name).toBeLessThan(3 / 100);
    }
  }, 240_000);

  it("the last wall's distance off the rail is never read out below nothing, across the whole of Off Stringer's slider; where it is a real distance it is channelFit's own", () => {
    let pastTheRail = 0;
    for (const { id, board } of BOARDS) {
      for (const count of [4, 6, 8] as const) {
        for (let quarters = 0; quarters <= 36; quarters++) {
          const ch = resolveChannels({ ...startingChannels(count, board, DEFAULT_BOTTOM.channels), run: "rail", offStringer: inchesToMm(quarters / 4) }, board);
          const fit = channelFit(ch, board, "narrowest");
          const { lastWallOffRail } = channelReadout(ch, board, "narrowest");
          expect(lastWallOffRail, `${id} · ${count} · ${quarters / 4}"`).toBeGreaterThanOrEqual(0);
          if (fit.offRail >= 0) expect(lastWallOffRail).toBe(fit.offRail);
          else {
            pastTheRail++;
            expect(lastWallOffRail).toBe(0);
            // and such a set has no channels anywhere: there is no wall to measure from
            for (const s of bottomDataStations(board)) expect(channelEdges(ch, board, "narrowest", s)).toEqual([]);
          }
        }
      }
    }
    // the slider does reach it: an Off Stringer wider than the board is at the deepest station
    expect(pastTheRail).toBeGreaterThan(0);
  });
});
