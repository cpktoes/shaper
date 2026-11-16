import { describe, expect, it } from "vitest";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import {
  bottomFloorFlags,
  bottomLayoutMarks,
  cutFoamOff,
  DEFAULT_BOTTOM,
  resolveBottom,
  resolveCut,
  startingCut,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
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
 * A belly's Off Stringer (quick 261116-jqz, D-01/D-02/D-03): a flat panel each side of the stringer, the belly rolling
 * from the panel's edge out to the rail. Every expected figure is the app's own (bottomLayoutMarks, cutFoamOff,
 * formatMark...); only inch inputs like inchesToMm(3) are typed.
 */

const BELLIES: readonly (readonly [BottomSectionKey, BottomCutName, number])[] = [
  ["center", "Continuous Belly / Rolled Mid", 3],
  ["nose", "Rolled Belly Entry", 2],
];

function boardOf(fields: DesignSummaryFields): BottomBoard {
  return designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
}

const ALL = phase16Boards().map(({ label, fields }) => ({ label, fields, board: boardOf(fields) }));

const SHORT = (() => {
  const preset = BOARD_PRESETS.find((p) => p.id === "shortboard")!;
  const label = `${preset.id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`;
  return ALL.find((b) => b.label === label)!;
})();

/** A bottom whose one section holds `name` on its starting numbers, then an Off Stringer of `panelIn` inches. */
function bellyBottom(board: BottomBoard, section: BottomSectionKey, name: BottomCutName, panelIn: number): BoardBottom {
  const bottom = structuredClone(DEFAULT_BOTTOM);
  bottom[section] = { ...startingCut(section, name, board), offStringer: mm(inchesToMm(panelIn)) };
  return bottom;
}

function halfInchStations(board: BottomBoard): Mm[] {
  const out: Mm[] = [];
  for (let s = 0; s <= board.length; s += inchesToMm(1 / 2)) out.push(mm(s));
  return out;
}

describe("a belly opens with no panel and reads as it always has (D-02)", () => {
  it.each(BELLIES.map(([section, name]) => [section, name] as const))("%s · %s: Off Stringer 0, no DATA column, no panel line, on every phase16 board", (section, name) => {
    for (const { board } of ALL) {
      const spec = startingCut(section, name, board);
      expect(spec.offStringer).toBe(0);
      const resolved = resolveBottom({ ...structuredClone(DEFAULT_BOTTOM), [section]: spec }, board);
      expect(bottomLayoutMarks(resolved, board).columns).toEqual([]);
      expect(bottomPencilLines(resolved, board, section).filter((l) => l.kind === "panel")).toEqual([]);
      for (const system of UNITS_SYSTEMS) {
        expect(bottomPrintLines(resolved, board, system).some((line) => line.includes("off the stringer"))).toBe(false);
      }
    }
  });
});

describe.each(BELLIES.map(([section, name, panelIn]) => ({ section, name, panelIn })))("$name with a panel of $panelIn\" (D-03)", ({ section, name, panelIn }) => {
  const board = SHORT.board;
  const bottom = bellyBottom(board, section, name, panelIn);
  const resolved = resolveBottom(bottom, board);
  const cut = resolveCut(section, bottom[section], board);
  const panel = cut.offStringer;

  it("DATA gets a flat column that reads the cut's Off Stringer wherever the cut is on, and nothing elsewhere", () => {
    const marks = bottomLayoutMarks(resolved, board);
    const col = marks.columns.findIndex((c) => c.key === `${section}:flat`);
    expect(col).toBeGreaterThanOrEqual(0);
    let seen = 0;
    for (const row of marks.rows) {
      const cell = row.cells[col];
      if (cell === null) continue;
      seen++;
      expect(cell).toBe(panel);
    }
    expect(seen).toBeGreaterThanOrEqual(3);
  });

  it("BOTTOM draws one panel line, every point at the Off Stringer across", () => {
    const lines = bottomPencilLines(resolved, board, section).filter((l) => l.kind === "panel");
    expect(lines).toHaveLength(1);
    let points = 0;
    for (const run of lines[0].runs) for (const [, y] of run) { points++; expect(Math.abs(y)).toBe(panel); }
    expect(points).toBeGreaterThan(10);
  });

  it("takes nothing off inside the panel, something past it, and the litres differ from the 0\" belly's", () => {
    let outside = 0;
    for (const s of halfInchStations(board)) {
      for (let y = 0; y <= panel; y += inchesToMm(1 / 4)) expect(cutFoamOff(cut, board, "natural", s, mm(y))).toBe(0);
      const W = board.railAt(s);
      if (W > panel) outside = Math.max(outside, cutFoamOff(cut, board, "natural", s, W));
    }
    expect(outside).toBeGreaterThan(0);
    const litresOf = (b: BoardBottom) => summarizeDesign({ ...SHORT.fields, bottom: b }).volumeLitres;
    expect(litresOf(bottom)).not.toBe(litresOf(bellyBottom(board, section, name, 0)));
  });

  it.each(UNITS_SYSTEMS.map((s) => [s] as const))("%s: the printed line names the panel; at 0 it does not", (system) => {
    const lines = bottomPrintLines(resolved, board, system);
    expect(lines).toHaveLength(1);
    expect(lines[0].endsWith(`; panel ${formatMark(panel, system)} off the stringer.`)).toBe(true);
    const plain = bottomPrintLines(resolveBottom(bellyBottom(board, section, name, 0), board), board, system);
    expect(plain[0].includes("panel")).toBe(false);
  });
});

describe("the floor check at a wide panel (D-03)", () => {
  it("a 1/2\" Rolled Belly Entry with Off Stringer 9\" flags no station where the rail is within the panel", () => {
    const board = SHORT.board;
    const spec = { ...startingCut("nose", "Rolled Belly Entry", board), offStringer: mm(inchesToMm(9)), depth: mm(inchesToMm(1 / 2)) };
    const resolved = resolveBottom({ ...structuredClone(DEFAULT_BOTTOM), nose: spec }, board);
    for (const flag of bottomFloorFlags(resolved, board)) {
      for (const s of [...flag.stringer, ...flag.rails]) expect(board.railAt(s)).toBeGreaterThan(spec.offStringer);
    }
  });
});
