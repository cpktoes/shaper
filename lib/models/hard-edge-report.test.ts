import { describe, expect, it } from "vitest";
import { phase16Boards } from "@/lib/geometry/__fixtures__/phase16-boards";
import { LIVE_DESIGN_RULES, summarizeDesign, summarizeDesignWith } from "@/lib/geometry/design";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { formatDim } from "@/lib/geometry/measure-display";
import { hardEdgeBlendsFrom, hardEdgeEndsAt } from "@/lib/geometry/rail-bands";
import { DEFAULT_FALLBACK_ROCKER } from "@/lib/geometry/rocker";
import { inchesToMm } from "@/lib/geometry/units";
import { HARD_EDGE_SWITCH } from "@/lib/geometry/volume";
import { buildSnapshot, parseSnapshot, type DesignSnapshotFields } from "./design-snapshot";
import { hardEdgeLitresMove, hardEdgeReportLines } from "./hard-edge-report";

/**
 * The founder's read-only report of how the hard edge's fade moves every saved board's litres (Phase 16,
 * D-20, 14 D-18). Every expected figure is worked out here from the app's own functions — the old switch by
 * name, the live fade by `summarizeDesign` — never typed.
 */

const BOARDS = phase16Boards();
const HARD = BOARDS.filter((b) => b.fields.rails.tailHardEdge);
const SOFT = BOARDS.filter((b) => !b.fields.rails.tailHardEdge);

const switchLitres = (fields: DesignSnapshotFields | (typeof BOARDS)[number]["fields"]) =>
  summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: HARD_EDGE_SWITCH }).volumeLitres;

/** A saved board as the site stores it, under a name the report must never print, read back the way the
 * check reads every board. */
const SECRET_NAME = "Chris's Secret Fish";
function savedBoard(index: number, extra: Partial<DesignSnapshotFields["rails"]> = {}): DesignSnapshotFields {
  const { fields } = HARD[index];
  const stored: DesignSnapshotFields = {
    ...fields,
    rocker: fields.rocker ?? DEFAULT_FALLBACK_ROCKER,
    blank: fields.blank ?? null,
    rails: { ...fields.rails, ...extra },
    fins: DEFAULT_FIN_PLACEMENT_SPEC,
    finsImportTemplate: true,
    boardName: SECRET_NAME,
    finSystem: "fcs2",
  };
  return parseSnapshot(Object.freeze(JSON.parse(JSON.stringify(buildSnapshot(stored)))));
}

describe("hardEdgeLitresMove", () => {
  it("is null for every board whose tail has no hard edge", () => {
    expect(SOFT.length).toBe(20);
    for (const { fields } of SOFT) expect(hardEdgeLitresMove(fields)).toBeNull();
  });

  it("reads the old switch before and the live fade after, on every hard-edged board of the forty", () => {
    expect(HARD.length).toBe(20);
    for (const { fields } of HARD) {
      const move = hardEdgeLitresMove(fields);
      expect(move).not.toBeNull();
      expect(move!.before).toBe(switchLitres(fields));
      expect(move!.after).toBe(summarizeDesign(fields).volumeLitres);
    }
  });

  it("follows a board's own Hard Edge Ends At after, and never before", () => {
    const fields = { ...HARD[0].fields, rails: { ...HARD[0].fields.rails, tailHardEdgeEndsAt: inchesToMm(24) } };
    const move = hardEdgeLitresMove(fields)!;
    expect(move.before).toBe(hardEdgeLitresMove(HARD[0].fields)!.before);
    expect(move.after).toBe(summarizeDesign(fields).volumeLitres);
    expect(move.after).not.toBe(hardEdgeLitresMove(HARD[0].fields)!.after);
  });
});

describe("hardEdgeReportLines", () => {
  const rows = BOARDS.map(({ label, fields }) => ({ id: label, fields }));

  it("prints the counts, then one line per hard-edged board with both settings, sorted by the size of its move, then the largest", () => {
    const lines = hardEdgeReportLines(rows);
    const moves = HARD.map(({ label, fields }) => ({
      id: label,
      before: switchLitres(fields),
      after: summarizeDesign(fields).volumeLitres,
      // No test board stores either setting, so both read the defaults.
      from: formatDim(hardEdgeBlendsFrom(fields.rails, fields.outline.length), "imperial"),
      to: formatDim(hardEdgeEndsAt(fields.rails, fields.outline.length), "imperial"),
    }));
    const sorted = moves
      .map((m, index) => ({ m, index }))
      .sort((a, b) => Math.abs(b.m.after - b.m.before) - Math.abs(a.m.after - a.m.before) || a.index - b.index)
      .map(({ m }) => m);
    const signed = (d: number) => `${d > 0 ? "+" : ""}${d.toFixed(4)}`;

    expect(lines[0]).toBe(`hard-edge report: ${BOARDS.length} saved boards; ${BOARDS.length} open; ${HARD.length} with a hard-edged tail`);
    expect(lines.slice(1, 1 + HARD.length)).toEqual(
      sorted.map(
        (m) =>
          `${m.id}: blends from ${m.from} (default) · ends at ${m.to} (default) — ` +
          `${m.before.toFixed(2)} → ${m.after.toFixed(2)} L (${signed(m.after - m.before)})`,
      ),
    );
    const largest = sorted[0];
    expect(lines[1 + HARD.length]).toBe(`largest move: ${largest.id}, ${signed(largest.after - largest.before)} L`);
    expect(lines.length).toBe(HARD.length + 2);
    // No soft board is printed.
    for (const { label } of SOFT) expect(lines.some((line) => line.startsWith(`${label}:`))).toBe(false);
  });

  it("counts a board that did not open but never prints it with data", () => {
    const lines = hardEdgeReportLines([{ id: "board-that-broke", fields: null }, ...rows.slice(0, 2)]);
    expect(lines[0]).toBe("hard-edge report: 3 saved boards; 2 open, 1 did not open; 1 with a hard-edged tail");
    expect(lines.join("\n")).not.toContain("board-that-broke");
  });

  it("reads none when no board has a hard-edged tail", () => {
    const lines = hardEdgeReportLines(rows.filter((r) => !r.fields.rails.tailHardEdge));
    expect(lines).toEqual([`hard-edge report: ${SOFT.length} saved boards; ${SOFT.length} open; 0 with a hard-edged tail`, "largest move: none"]);
  });

  it("on two frozen saved boards read through parseSnapshot, prints ids, settings and litres only — never a board's name", () => {
    const first = savedBoard(0);
    const second = savedBoard(4, { tailHardEdgeBlendsFrom: inchesToMm(16), tailHardEdgeEndsAt: inchesToMm(22) });
    expect(first.boardName).toBe(SECRET_NAME);
    const lines = hardEdgeReportLines([
      { id: "a1", fields: first },
      { id: "b2", fields: second },
    ]);
    const text = lines.join("\n");
    expect(text).not.toContain(SECRET_NAME);
    expect(text).not.toContain("Secret");
    expect(lines[0]).toBe("hard-edge report: 2 saved boards; 2 open; 2 with a hard-edged tail");
    for (const [id, fields] of [["a1", first], ["b2", second]] as const) {
      const move = hardEdgeLitresMove(fields)!;
      expect(move.after).toBe(summarizeDesign(fields).volumeLitres);
      const line = lines.find((l) => l.startsWith(`${id}: `));
      expect(line).toContain(` — ${move.before.toFixed(2)} → ${move.after.toFixed(2)} L (`);
    }
    // The board that stores its own pair prints it as stored; the other prints the defaults, marked.
    const b2 = lines.find((l) => l.startsWith("b2: "))!;
    expect(b2).toContain(`blends from ${formatDim(inchesToMm(16), "imperial")} · ends at ${formatDim(inchesToMm(22), "imperial")} — `);
    const a1 = lines.find((l) => l.startsWith("a1: "))!;
    expect(a1).toContain(" (default) · ends at ");
    // Every printed line is a count, an id with its settings and litres, or the largest move.
    for (const line of lines.slice(1)) {
      expect(line).toMatch(/^(a1|b2): blends from .+ · ends at .+ — \d+\.\d\d → \d+\.\d\d L \([+-]?\d+\.\d{4}\)$|^largest move: /);
    }
  });
});
