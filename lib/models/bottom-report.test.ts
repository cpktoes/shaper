import { describe, expect, it } from "vitest";
import { DEFAULT_BOTTOM, bottomHasCut, pickCut, startingChannels, type BoardBottom } from "@/lib/geometry/bottom";
import {
  LIVE_DESIGN_RULES,
  designBottomBoard,
  designFinPlacement,
  designSideProfile,
  summarizeDesign,
} from "@/lib/geometry/design";
import { buildOutline } from "@/lib/geometry/outline";
import { bottomReport, bottomReportLines } from "./bottom-report";
import { buildSnapshot, parseSnapshot, type DesignSnapshotFields } from "./design-snapshot";
import { standInRackRows } from "./rack-stand-in";

/**
 * The founder's read-only report before BOTTOM's saving ships (Phase 17, D-24): every saved board opens, none has a
 * cut, and every litres figure is what the site reads today. Every expected figure is worked out here from the
 * app's own functions — never typed.
 */

/** Saved boards as the site stores them today: none carries a bottom. */
const SAVED = standInRackRows(12).map(({ id, snapshot }) => ({ id, snapshot }));
const SECRET_NAME = "Chris's Secret Fish";

function fieldsOf(row: { snapshot: unknown }): DesignSnapshotFields {
  return parseSnapshot(row.snapshot);
}

/** A stored row whose board carries `bottom`, under a name the report must never print. */
function rowWithBottom(id: string, bottom: unknown): { id: string; snapshot: unknown } {
  const stored = JSON.parse(JSON.stringify(buildSnapshot({ ...fieldsOf(SAVED[1]), boardName: SECRET_NAME })));
  stored.design.bottom = bottom;
  return { id, snapshot: stored };
}

/** A Deep Single Concave and six channels on the second saved board. */
function cutBottom(): BoardBottom {
  const fields = fieldsOf(SAVED[1]);
  const board = designBottomBoard(
    fields.outline,
    buildOutline(fields.outline),
    designSideProfile(fields, LIVE_DESIGN_RULES),
    designFinPlacement(fields),
  );
  const picked = pickCut(DEFAULT_BOTTOM, "center", "Deep Single Concave", board);
  return { ...picked, channels: startingChannels(6, board, picked.channels) };
}

describe("bottomReport", () => {
  it("a board saved before BOTTOM opens, has no cut, and reads the litres the site reads today", () => {
    const report = bottomReport(SAVED);
    expect(report).toHaveLength(SAVED.length);
    report.forEach((line, i) => {
      const litres = summarizeDesign(fieldsOf(SAVED[i])).volumeLitres;
      expect(line).toEqual({ id: SAVED[i].id, opens: true, hasCut: false, litres, litresToday: litres });
    });
  });

  it("a board saved with a cut says so, and its litres are fewer than the site reads today", () => {
    const bottom = cutBottom();
    expect(bottomHasCut(bottom)).toBe(true);
    const [line] = bottomReport([rowWithBottom("with-a-cut", JSON.parse(JSON.stringify(bottom)))]);
    const fields = { ...fieldsOf(SAVED[1]), boardName: SECRET_NAME };
    expect(line.opens).toBe(true);
    expect(line.hasCut).toBe(true);
    expect(line.litres).toBe(summarizeDesign({ ...fields, bottom }).volumeLitres);
    expect(line.litresToday).toBe(summarizeDesign(fields).volumeLitres);
    expect(line.litres).toBeLessThan(line.litresToday);
  });

  it("a bottom that cannot be read is no cut and no change: the board opens flat", () => {
    for (const bad of ["x", 7, null, [], { nose: { name: "Bonzer" } }]) {
      const [line] = bottomReport([rowWithBottom("crafted", bad)]);
      expect(line.opens, JSON.stringify(bad)).toBe(true);
      expect(line.hasCut, JSON.stringify(bad)).toBe(false);
      expect(line.litres, JSON.stringify(bad)).toBe(line.litresToday);
    }
  });

  it("a row that is not a board does not open, and never stops the report", () => {
    const rows = [
      { id: "not-a-board", snapshot: "x" },
      { id: "no-snapshot", snapshot: null },
      { id: "wrong-shape", snapshot: { version: 5, design: { outline: 7 } } },
      SAVED[0],
    ];
    expect(() => bottomReport(rows)).not.toThrow();
    const report = bottomReport(rows);
    for (const line of report.slice(0, 3)) expect(line).toEqual({ id: line.id, opens: false, hasCut: false, litres: 0, litresToday: 0 });
    expect(report.map((line) => line.id)).toEqual(rows.map((row) => row.id));
    expect(report[3].opens).toBe(true);
  });

  it("reads only: the rows handed in are left exactly as they were", () => {
    const rows = SAVED.map((row) => ({ id: row.id, snapshot: JSON.parse(JSON.stringify(row.snapshot)) }));
    const before = JSON.stringify(rows);
    bottomReport(rows.map((row) => ({ ...row, snapshot: Object.freeze(row.snapshot) })));
    expect(JSON.stringify(rows)).toBe(before);
  });
});

describe("bottomReportLines", () => {
  it("every saved board on one line each, then the answer the founder is asking for", () => {
    const lines = bottomReportLines(SAVED);
    expect(lines[0]).toBe(
      `bottom report: ${SAVED.length} saved boards; ${SAVED.length} open; 0 with a cut; 0 whose litres differ from today's`,
    );
    expect(lines).toHaveLength(SAVED.length + 2);
    SAVED.forEach((row, i) => {
      const litres = summarizeDesign(fieldsOf(row)).volumeLitres.toFixed(2);
      expect(lines[i + 1]).toBe(`${row.id}: opens · no cut — ${litres} L (same as today)`);
    });
    expect(lines.at(-1)).toBe("every saved board opens flat, with the litres it reads today: yes");
  });

  it("a board with a cut, and one that did not open, are counted and shown, and the answer is no", () => {
    const bottom = cutBottom();
    const rows = [SAVED[0], rowWithBottom("with-a-cut", JSON.parse(JSON.stringify(bottom))), { id: "not-a-board", snapshot: "x" }];
    const lines = bottomReportLines(rows);
    const fields = fieldsOf(SAVED[1]);
    const now = summarizeDesign({ ...fields, bottom }).volumeLitres;
    const today = summarizeDesign(fields).volumeLitres;
    expect(lines[0]).toBe("bottom report: 3 saved boards; 2 open, 1 did not open; 1 with a cut; 1 whose litres differ from today's");
    expect(lines[2]).toBe(
      `with-a-cut: opens · has a cut — ${now.toFixed(2)} L (today ${today.toFixed(2)} L, ${(now - today).toFixed(4)})`,
    );
    expect(lines[3]).toBe("not-a-board: did not open");
    expect(lines.at(-1)).toBe("every saved board opens flat, with the litres it reads today: no — 2 to look at");
  });

  it("no saved boards at all is said plainly", () => {
    expect(bottomReportLines([])).toEqual([
      "bottom report: 0 saved boards; 0 open; 0 with a cut; 0 whose litres differ from today's",
      "every saved board opens flat, with the litres it reads today: yes",
    ]);
  });

  it("prints ids and litres only — never a board's name or anything else from its snapshot", () => {
    const rows = [rowWithBottom("named", JSON.parse(JSON.stringify(cutBottom()))), rowWithBottom("named-flat", undefined)];
    const text = bottomReportLines(rows).join("\n");
    expect(text).not.toContain(SECRET_NAME);
    expect(text).not.toContain("Secret");
    expect(text).not.toContain("Deep Single Concave");
    expect(text).not.toContain("{");
    for (const line of bottomReportLines(rows).slice(1, -1)) expect(line).toMatch(/^named(-flat)?: opens · (no cut|has a cut) — \d+\.\d\d L \(/);
  });
});
