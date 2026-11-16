import { describe, expect, it } from "vitest";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import {
  BOTTOM_SECTIONS,
  bottomFloorFlags,
  bottomLayoutMarks,
  cutFoamOff,
  cutHalfWidth,
  DEFAULT_BOTTOM,
  DOUBLE_TROUGH_GAP,
  DOUBLE_TROUGH_RUNS,
  DOUBLE_TROUGH_SHARE,
  doubleMarks,
  foamOff,
  keepStationsInOrder,
  resolveBottom,
  resolveCut,
  startingCut,
  switchTroughRun,
  troughByHandAt,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomCutSpec,
  type BottomSectionKey,
} from "./bottom";
import { bottomPencilLines } from "./bottom-draw";
import { bottomPrintLines } from "./bottom-print";
import type { DesignSummaryFields } from "./design";
import { designBottomBoard, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES, summarizeDesign } from "./design";
import { formatMark } from "./measure-display";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm, UNITS_SYSTEMS, type Mm } from "./units";

/*
 * The three ways a double concave's trough can run (quick 261115-mc1): Parallel (today's rule), Centered and By hand.
 * Every expected figure here is worked out by the app's own functions (doubleMarks, cutHalfWidth, formatMark…) — none
 * is typed; only inch inputs like inchesToMm(4) are.
 */

const DOUBLES: readonly (readonly [BottomSectionKey, BottomCutName])[] = [
  ["center", "Early Double Concave"],
  ["tail", "Double Concave Exit"],
  ["tail", "Spiral Vee"],
];
const WING_RULES = ["natural", "narrowest"] as const;

function boardOf(fields: DesignSummaryFields): BottomBoard {
  return designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
}

const ALL = phase16Boards().map(({ label, fields }) => ({ label, fields, board: boardOf(fields) }));

/** The preset's own board as its card opens it (`asis`, the preset's own Hard Edge). */
function presetBoard(id: string) {
  const preset = BOARD_PRESETS.find((p) => p.id === id)!;
  const label = `${preset.id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`;
  return ALL.find((b) => b.label === label)!;
}

const SHORT = presetBoard("shortboard");

/** A bottom whose one section holds a double on its starting numbers, then `patch`. */
function bottomWith(
  board: BottomBoard,
  section: BottomSectionKey,
  name: BottomCutName,
  wingRule: BoardBottom["wingRule"] = "natural",
  patch: Partial<BottomCutSpec> = {},
): BoardBottom {
  const bottom = structuredClone(DEFAULT_BOTTOM);
  bottom[section] = { ...startingCut(section, name, board), ...patch };
  bottom.wingRule = wingRule;
  return bottom;
}

const cutOf = (bottom: BoardBottom, board: BottomBoard, section: BottomSectionKey) => resolveCut(section, bottom[section], board);

/** Every 1/2" station from the tail to the nose. */
function halfInchStations(board: BottomBoard): Mm[] {
  const out: Mm[] = [];
  for (let s = 0; s <= board.length; s += inchesToMm(1 / 2)) out.push(mm(s));
  return out;
}

/** Every foam-off figure across a board: each 1/2" station × 61 points from the stringer to the rail. */
function foamGrid(bottom: BoardBottom, board: BottomBoard): number[] {
  const resolved = resolveBottom(bottom, board);
  const grid: number[] = [];
  for (const s of halfInchStations(board)) {
    const W = board.railAt(s);
    for (let j = 0; j <= 60; j++) grid.push(foamOff(resolved, board, s, mm((W * j) / 60)));
  }
  return grid;
}

describe("a new pick opens Parallel and stores today's bytes (D-02, D-05, D-06)", () => {
  it.each(DOUBLES.map(([section, name]) => [section, name] as const))("%s · %s: no troughRun key on every preset", (section, name) => {
    for (const { board } of ALL) {
      const spec = startingCut(section, name, board);
      expect("troughRun" in spec).toBe(false);
      expect("troughStart" in spec).toBe(false);
      expect("troughEnd" in spec).toBe(false);
      expect(resolveCut(section, spec, board).troughRun).toBe("parallel");
    }
  });

  it("a flat resolves Parallel too, and the three rules are listed in the menu's order", () => {
    const flat = resolveBottom(DEFAULT_BOTTOM, SHORT.board);
    for (const section of BOTTOM_SECTIONS) expect(flat[section].troughRun).toBe("parallel");
    expect([...DOUBLE_TROUGH_RUNS]).toEqual(["parallel", "centered", "hand"]);
  });
});

describe("Parallel is bit-identical to a stored rule that is absent (D-02)", () => {
  it("every phase16 board × three doubles × both wing rules: the foam, DATA's marks and the printed words", () => {
    for (const { board } of ALL) {
      for (const [section, name] of DOUBLES) {
        for (const rule of WING_RULES) {
          const absent = bottomWith(board, section, name, rule);
          const explicit = bottomWith(board, section, name, rule, { troughRun: "parallel" });
          const a = foamGrid(absent, board);
          const b = foamGrid(explicit, board);
          expect(a.length).toBe(b.length);
          for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) throw new Error(`foam differs at ${i}`);
          const ra = resolveBottom(absent, board);
          const rb = resolveBottom(explicit, board);
          expect(bottomLayoutMarks(ra, board)).toEqual(bottomLayoutMarks(rb, board));
          for (const system of UNITS_SYSTEMS) expect(bottomPrintLines(ra, board, system)).toEqual(bottomPrintLines(rb, board, system));
        }
      }
    }
  }, 240_000);
});

describe("Centered: halfway between the flat's edge and the cut's edge (D-03)", () => {
  it("wherever the cut is on and has room, the trough is as far from the flat as from the edge; always inside the clamps", () => {
    for (const { board } of ALL) {
      for (const [section, name] of DOUBLES) {
        const spec = { ...startingCut(section, name, board), troughRun: "centered" as const };
        const cut = resolveCut(section, spec, board);
        for (const s of halfInchStations(board)) {
          const C = cutHalfWidth(cut, board, "natural", s);
          if (C <= 0) continue;
          const { flat, trough } = doubleMarks(cut, C);
          expect(trough).toBeGreaterThanOrEqual(flat + DOUBLE_TROUGH_GAP - 1e-9);
          expect(trough).toBeLessThanOrEqual(Math.max(flat + DOUBLE_TROUGH_GAP, C * DOUBLE_TROUGH_SHARE) + 1e-9);
          if (C - flat >= inchesToMm(1 / 2)) expect(Math.abs(trough - flat - (C - trough))).toBeLessThan(1e-9);
        }
      }
    }
  }, 120_000);

  it("on the Shortboard's Double Concave Exit the trough is further off the stringer near Start than near End", () => {
    const bottom = bottomWith(SHORT.board, "tail", "Double Concave Exit", "natural", { troughRun: "centered" });
    const cut = cutOf(bottom, SHORT.board, "tail");
    const at = (s: Mm) => doubleMarks(cut, cutHalfWidth(cut, SHORT.board, "natural", s)).trough;
    expect(at(mm(cut.start - inchesToMm(1)))).toBeGreaterThan(at(mm(cut.end + inchesToMm(1))));
  });
});

describe("every reader follows Centered (D-07)", () => {
  const board = SHORT.board;
  const centered = bottomWith(board, "tail", "Double Concave Exit", "natural", { troughRun: "centered" });
  const parallel = bottomWith(board, "tail", "Double Concave Exit");
  const resolved = resolveBottom(centered, board);
  const cut = resolved.tail;

  it("DATA's tail:trough cell at each station is the rule's own figure", () => {
    const marks = bottomLayoutMarks(resolved, board);
    const col = marks.columns.findIndex((c) => c.key === "tail:trough");
    expect(col).toBeGreaterThanOrEqual(0);
    let seen = 0;
    for (const row of marks.rows) {
      const cell = row.cells[col];
      if (cell === null) continue;
      seen++;
      const C = cutHalfWidth(cut, board, "natural", row.station);
      expect(cell).toBe(doubleMarks(cut, C).trough);
    }
    expect(seen).toBeGreaterThanOrEqual(3);
  });

  it("BOTTOM's dotted trough line follows it point for point", () => {
    const trough = bottomPencilLines(resolved, board, "tail").find((l) => l.kind === "trough")!;
    let points = 0;
    for (const run of trough.runs) {
      for (const [s, y] of run) {
        if (y < 0) continue;
        points++;
        const C = cutHalfWidth(cut, board, "natural", mm(s));
        expect(y).toBe(doubleMarks(cut, C).trough);
      }
    }
    expect(points).toBeGreaterThan(50);
  });

  it("the foam is deepest at the Centered trough, and the litres differ from Parallel's", () => {
    const s = mm((cut.start + cut.end) / 2);
    const C = cutHalfWidth(cut, board, "natural", s);
    const { trough } = doubleMarks(cut, C);
    const here = cutFoamOff(cut, board, "natural", s, trough);
    for (const dy of [-inchesToMm(1 / 4), inchesToMm(1 / 4)]) expect(here).toBeGreaterThan(cutFoamOff(cut, board, "natural", s, mm(trough + dy)));
    const litresOf = (bottom: BoardBottom) => summarizeDesign({ ...SHORT.fields, bottom }).volumeLitres;
    expect(litresOf(centered)).not.toBe(litresOf(parallel));
  });
});

describe("switchTroughRun", () => {
  const board = SHORT.board;
  const spec = startingCut("tail", "Double Concave Exit", board);

  it("picking the rule already in use returns the same spec; absent counts as Parallel", () => {
    expect(switchTroughRun(spec, "parallel")).toBe(spec);
    const centered = switchTroughRun(spec, "centered");
    expect(switchTroughRun(centered, "centered")).toBe(centered);
  });

  it("a non-double comes back unchanged", () => {
    const single = startingCut("center", "Deep Single Concave", board);
    for (const run of DOUBLE_TROUGH_RUNS) expect(switchTroughRun(single, run)).toBe(single);
    const flat = startingCut("tail", "Flat Exit", board);
    expect(switchTroughRun(flat, "centered")).toBe(flat);
  });

  it("Centered writes the rule and nothing else", () => {
    const centered = switchTroughRun(spec, "centered");
    expect(centered).toEqual({ ...spec, troughRun: "centered" });
    expect(Object.keys(centered).sort()).toEqual([...Object.keys(spec), "troughRun"].sort());
  });
});

describe("the printed BOTTOM CONTOURS sentence names the rule (D-07)", () => {
  const board = SHORT.board;
  it.each(UNITS_SYSTEMS.map((s) => [s] as const))("%s: Parallel's words are today's, Centered's say so", (system) => {
    const parallel = bottomWith(board, "tail", "Double Concave Exit");
    const centered = bottomWith(board, "tail", "Double Concave Exit", "natural", { troughRun: "centered" });
    const p = resolveBottom(parallel, board).tail;
    const lineOf = (bottom: BoardBottom) => bottomPrintLines(resolveBottom(bottom, board), board, system)[0];
    expect(lineOf(parallel).endsWith(`flat ${formatMark(p.offStringer, system)} and trough ${formatMark(p.troughAt, system)} off the stringer.`)).toBe(true);
    expect(lineOf(centered).endsWith(`; ${formatMark(p.offRail, system)} off the rail, flat ${formatMark(p.offStringer, system)} off the stringer and trough centered between the flat and the edge.`)).toBe(true);
  });
});

/* ============ By hand (D-04): a straight line from Start to End ============ */

describe("troughByHandAt: the batten laid between the two marks (D-04)", () => {
  const cut = { start: mm(inchesToMm(20)), end: mm(inchesToMm(4)), troughStart: mm(inchesToMm(4)), troughEnd: mm(inchesToMm(1.5)) };

  it("reads Start's figure at Start and End's at End, and their mean halfway", () => {
    expect(troughByHandAt(cut, cut.start)).toBe(cut.troughStart);
    expect(troughByHandAt(cut, cut.end)).toBe(cut.troughEnd);
    expect(Math.abs(troughByHandAt(cut, mm((cut.start + cut.end) / 2)) - (cut.troughStart + cut.troughEnd) / 2)).toBeLessThan(1e-9);
  });

  it("holds the nearer end's figure beyond them", () => {
    expect(troughByHandAt(cut, mm(cut.start + inchesToMm(9)))).toBe(cut.troughStart);
    expect(troughByHandAt(cut, mm(cut.end - inchesToMm(3)))).toBe(cut.troughEnd);
  });

  it("runs straight: equal steps along the board move it by equal steps", () => {
    const a = troughByHandAt(cut, mm(cut.end + inchesToMm(4)));
    const b = troughByHandAt(cut, mm(cut.end + inchesToMm(8)));
    const c = troughByHandAt(cut, mm(cut.end + inchesToMm(12)));
    expect(Math.abs(b - a - (c - b))).toBeLessThan(1e-9);
  });

  it("Start equal to End reads Start's figure, with no division by zero", () => {
    const flat = { ...cut, start: cut.end };
    for (const s of [mm(cut.end - 5), cut.end, mm(cut.end + 5)]) {
      expect(Number.isFinite(troughByHandAt(flat, s))).toBe(true);
    }
    expect(troughByHandAt(flat, cut.end)).toBe(flat.troughStart);
  });
});

describe("By hand: resolved, switched to, and kept like Trough At", () => {
  const board = SHORT.board;
  const spec = startingCut("tail", "Double Concave Exit", board);

  it("an absent Trough at Start or End reads the cut's Trough At (D-06)", () => {
    const cut = resolveCut("tail", spec, board);
    expect(cut.troughStart).toBe(spec.troughAt);
    expect(cut.troughEnd).toBe(spec.troughAt);
    const half = resolveCut("tail", { ...spec, troughRun: "hand", troughStart: mm(inchesToMm(5)) }, board);
    expect(half.troughStart).toBe(inchesToMm(5));
    expect(half.troughEnd).toBe(spec.troughAt);
  });

  it("switching to By hand seeds both ends at Trough At and changes no other key", () => {
    for (const from of ["parallel", "centered"] as const) {
      const base = from === "centered" ? switchTroughRun(spec, "centered") : spec;
      const hand = switchTroughRun(base, "hand");
      expect(hand).toEqual({ ...base, troughRun: "hand", troughStart: spec.troughAt, troughEnd: spec.troughAt });
    }
  });

  it("picking By hand again keeps the shaper's two ends (the very same spec)", () => {
    const hand = { ...switchTroughRun(spec, "hand"), troughStart: mm(inchesToMm(4)), troughEnd: mm(inchesToMm(1.5)) };
    expect(switchTroughRun(hand, "hand")).toBe(hand);
  });

  it("nothing jumps: on every phase16 board x three doubles x both wing rules, just-switched By hand is bit-identical to Parallel", () => {
    for (const { board: b } of ALL) {
      for (const [section, name] of DOUBLES) {
        for (const rule of WING_RULES) {
          const parallel = bottomWith(b, section, name, rule);
          const handSpec = switchTroughRun(parallel[section], "hand");
          expect(handSpec.troughRun).toBe("hand");
          const hand: BoardBottom = { ...parallel, [section]: handSpec };
          const x = foamGrid(parallel, b);
          const y = foamGrid(hand, b);
          for (let i = 0; i < x.length; i++) if (!Object.is(x[i], y[i])) throw new Error(`foam moved at ${i}`);
          expect(bottomLayoutMarks(resolveBottom(hand, b), b)).toEqual(bottomLayoutMarks(resolveBottom(parallel, b), b));
        }
      }
    }
  }, 240_000);

  const keep = (patch: Partial<BottomCutSpec>) => keepStationsInOrder("tail", { ...spec, ...patch }, "deepest", board, "natural");

  it("keepStationsInOrder: a double without the two By-hand figures gains neither key", () => {
    const kept = keep({});
    expect("troughStart" in kept).toBe(false);
    expect("troughEnd" in kept).toBe(false);
    expect("troughRun" in kept).toBe(false);
  });

  it("keepStationsInOrder: each By-hand figure comes out exactly as Trough At would, set to the same value", () => {
    for (const inches of [0.5, 1.5, 3, 8]) {
      const asked = mm(inchesToMm(inches));
      const kept = keep({ troughRun: "hand", troughStart: asked, troughEnd: asked });
      const asTroughAt = keep({ troughAt: asked });
      expect(kept.troughStart).toBe(asTroughAt.troughAt);
      expect(kept.troughEnd).toBe(asTroughAt.troughAt);
      // the rule and the stored Trough At ride along untouched
      expect(kept.troughRun).toBe("hand");
      expect(kept.troughAt).toBe(keep({}).troughAt);
    }
  });
});

describe("every reader follows By hand (D-07)", () => {
  const board = SHORT.board;
  const hand = (start: number, end: number): BoardBottom =>
    bottomWith(board, "tail", "Double Concave Exit", "natural", { troughRun: "hand", troughStart: mm(inchesToMm(start)), troughEnd: mm(inchesToMm(end)) });
  const bottom = hand(4, 1.5);
  const resolved = resolveBottom(bottom, board);
  const cut = resolved.tail;

  it("DATA's cell, the dotted line and the deepest point of the foam all read the same figure at their own station", () => {
    const marks = bottomLayoutMarks(resolved, board);
    const col = marks.columns.findIndex((c) => c.key === "tail:trough");
    let seen = 0;
    for (const row of marks.rows) {
      const cell = row.cells[col];
      if (cell === null) continue;
      seen++;
      expect(cell).toBe(doubleMarks(cut, cutHalfWidth(cut, board, "natural", row.station), row.station).trough);
    }
    expect(seen).toBeGreaterThanOrEqual(3);

    const line = bottomPencilLines(resolved, board, "tail").find((l) => l.kind === "trough")!;
    let points = 0;
    for (const run of line.runs) {
      for (const [s, y] of run) {
        if (y < 0) continue;
        points++;
        expect(y).toBe(doubleMarks(cut, cutHalfWidth(cut, board, "natural", mm(s)), mm(s)).trough);
      }
    }
    expect(points).toBeGreaterThan(50);

    // the foam is deepest at the trough, at a station near each end
    for (const s of [mm(cut.start - inchesToMm(3)), mm(cut.end + inchesToMm(3))]) {
      const { trough } = doubleMarks(cut, cutHalfWidth(cut, board, "natural", s), s);
      const here = cutFoamOff(cut, board, "natural", s, trough);
      for (const dy of [-inchesToMm(1 / 4), inchesToMm(1 / 4)]) expect(here).toBeGreaterThan(cutFoamOff(cut, board, "natural", s, mm(trough + dy)));
    }
  });

  it("the trough runs from near Start's figure to near End's, and the litres differ from Parallel's", () => {
    const near = (s: Mm) => doubleMarks(cut, cutHalfWidth(cut, board, "natural", s), s).trough;
    expect(near(mm(cut.start - inchesToMm(1)))).toBeGreaterThan(near(mm(cut.end + inchesToMm(1))));
    const litresOf = (b: BoardBottom) => summarizeDesign({ ...SHORT.fields, bottom: b }).volumeLitres;
    expect(litresOf(bottom)).not.toBe(litresOf(bottomWith(board, "tail", "Double Concave Exit")));
  });

  it("the floor scan still reads: by hand and Parallel agree where the ends equal Trough At", () => {
    const plain = bottomWith(board, "tail", "Double Concave Exit");
    const same = { ...plain, tail: switchTroughRun(plain.tail, "hand") };
    expect(bottomFloorFlags(resolveBottom(same, board), board)).toEqual(bottomFloorFlags(resolveBottom(plain, board), board));
    for (const flag of bottomFloorFlags(resolved, board)) for (const s of [...flag.stringer, ...flag.rails]) expect(Number.isFinite(s)).toBe(true);
  });
});

describe("the printed sentence under By hand (D-07)", () => {
  const board = SHORT.board;
  it.each(UNITS_SYSTEMS.map((s) => [s] as const))("%s: both figures, as set", (system) => {
    const bottom = bottomWith(board, "tail", "Double Concave Exit", "natural", { troughRun: "hand", troughStart: mm(inchesToMm(4)), troughEnd: mm(inchesToMm(1.5)) });
    const c = resolveBottom(bottom, board).tail;
    const line = bottomPrintLines(resolveBottom(bottom, board), board, system)[0];
    expect(line.endsWith(`; ${formatMark(c.offRail, system)} off the rail, flat ${formatMark(c.offStringer, system)} off the stringer and trough ${formatMark(c.troughStart, system)} off it at the start, ${formatMark(c.troughEnd, system)} at the end.`)).toBe(true);
  });
});
