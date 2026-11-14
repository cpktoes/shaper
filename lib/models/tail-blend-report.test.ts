import { describe, expect, it } from "vitest";
import { asD30Read, phase16SurfaceBoards } from "@/lib/geometry/__fixtures__/phase16-boards";
import { summarizeDesign } from "@/lib/geometry/design";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { formatDim } from "@/lib/geometry/measure-display";
import {
  d30HardEdgeBlendsFrom,
  d30HardEdgeEndsAt,
  hardEdgeBlendsFrom,
  hardEdgeEndsAt,
} from "@/lib/geometry/rail-bands";
import { DEFAULT_FALLBACK_ROCKER } from "@/lib/geometry/rocker";
import { inchesToMm } from "@/lib/geometry/units";
import { buildSnapshot, parseSnapshot, type DesignSnapshotFields } from "./design-snapshot";
import { tailBlendLitresMove, tailBlendReportLines } from "./tail-blend-report";

/**
 * The founder's read-only report of which saved boards' litres the new Tail Rail Blends From / Ends At default moves
 * (quick 261113-psx, the 14 D-18 report rule). Every expected figure is worked out here from the app's own functions —
 * the board as D-30 read it by `asD30Read`, the board as stored by `summarizeDesign` — never typed.
 */

const BOARDS = phase16SurfaceBoards();
const MOVING = BOARDS.filter(({ fields }) => summarizeDesign(asD30Read(fields)).volumeLitres !== summarizeDesign(fields).volumeLitres);
const STILL = BOARDS.filter(({ fields }) => summarizeDesign(asD30Read(fields)).volumeLitres === summarizeDesign(fields).volumeLitres);

/** A saved board as the site stores it, under a name the report must never print, read back the way the check
 * reads every board. */
const SECRET_NAME = "Chris's Secret Fish";
function savedBoard(index: number, extra: Partial<DesignSnapshotFields["rails"]> = {}): DesignSnapshotFields {
  const { fields } = MOVING[index];
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

const signed = (d: number) => `${d > 0 ? "+" : ""}${d.toFixed(4)}`;

describe("tailBlendLitresMove", () => {
  it("has boards on both sides, or the cases below prove nothing", () => {
    expect(BOARDS).toHaveLength(102);
    expect(MOVING.length).toBeGreaterThan(20);
    expect(STILL.length).toBeGreaterThan(0);
  });

  it("reads the board as D-30 read it before and as stored after, and is null where the two are the same number", () => {
    for (const { label, fields } of BOARDS) {
      const move = tailBlendLitresMove(fields);
      const before = summarizeDesign(asD30Read(fields)).volumeLitres;
      const after = summarizeDesign(fields).volumeLitres;
      if (before === after) expect(move, label).toBeNull();
      else expect(move, label).toEqual({ before, after });
    }
  }, 120_000);

  it("moves nothing on a board that stores a pair inside its windows", () => {
    for (const { label, fields } of BOARDS.slice(0, 20)) {
      const stored = { ...fields, rails: { ...fields.rails, tailHardEdgeBlendsFrom: inchesToMm(20), tailHardEdgeEndsAt: inchesToMm(26) } };
      expect(tailBlendLitresMove(stored), label).toBeNull();
    }
  });

  it("moves a board that stores only its Ends At, because its Blends From now reads 12", () => {
    const { fields } = MOVING[0];
    const only = { ...fields, rails: { ...fields.rails, tailHardEdgeEndsAt: inchesToMm(26) } };
    const move = tailBlendLitresMove(only);
    expect(move).not.toBeNull();
    expect(hardEdgeBlendsFrom(only.rails, only.outline.length)).toBe(inchesToMm(12));
    expect(d30HardEdgeBlendsFrom(only.rails, only.outline.length)).toBe(inchesToMm(18));
  });
});

describe("tailBlendReportLines", () => {
  const rows = BOARDS.map(({ label, fields }) => ({ id: label, fields }));

  it("prints the counts, then one line per board whose litres move with both settings before and after, the largest move first, then the largest", () => {
    const lines = tailBlendReportLines(rows);
    const moves = MOVING.map(({ label, fields }) => ({
      id: label,
      before: summarizeDesign(asD30Read(fields)).volumeLitres,
      after: summarizeDesign(fields).volumeLitres,
      // No stand-in board stores either setting, so both read the defaults.
      from: `${formatDim(d30HardEdgeBlendsFrom(fields.rails, fields.outline.length), "imperial")} → ${formatDim(hardEdgeBlendsFrom(fields.rails, fields.outline.length), "imperial")}`,
      to: `${formatDim(d30HardEdgeEndsAt(fields.rails, fields.outline.length), "imperial")} → ${formatDim(hardEdgeEndsAt(fields.rails, fields.outline.length), "imperial")}`,
    }));
    const sorted = moves
      .map((m, index) => ({ m, index }))
      .sort((a, b) => Math.abs(b.m.after - b.m.before) - Math.abs(a.m.after - a.m.before) || a.index - b.index)
      .map(({ m }) => m);

    expect(lines[0]).toBe(`tail-blend report: ${BOARDS.length} saved boards; ${BOARDS.length} open; ${MOVING.length} whose litres move`);
    expect(lines.slice(1, 1 + MOVING.length)).toEqual(
      sorted.map(
        (m) =>
          `${m.id}: blends from ${m.from} (default) · ends at ${m.to} (default) — ` +
          `${m.before.toFixed(2)} → ${m.after.toFixed(2)} L (${signed(m.after - m.before)})`,
      ),
    );
    const largest = sorted[0];
    expect(lines[1 + MOVING.length]).toBe(`largest move: ${largest.id}, ${signed(largest.after - largest.before)} L`);
    expect(lines.length).toBe(MOVING.length + 2);
    // A board the new default does not move is not printed.
    for (const { label } of STILL) expect(lines.some((line) => line.startsWith(`${label}:`))).toBe(false);
  }, 120_000);

  it("counts a board that did not open but never prints it with data", () => {
    const lines = tailBlendReportLines([{ id: "board-that-broke", fields: null }, ...rows.slice(0, 2)]);
    expect(lines[0]).toMatch(/^tail-blend report: 3 saved boards; 2 open, 1 did not open; \d whose litres move$/);
    expect(lines.join("\n")).not.toContain("board-that-broke");
  });

  it("reads none when no board's litres move", () => {
    const lines = tailBlendReportLines(STILL.map(({ label, fields }) => ({ id: label, fields })));
    expect(lines).toEqual([`tail-blend report: ${STILL.length} saved boards; ${STILL.length} open; 0 whose litres move`, "largest move: none"]);
  });

  it("on two frozen saved boards read through parseSnapshot, prints ids, settings and litres only — never a board's name", () => {
    const first = savedBoard(0);
    // A board that stores its own pair is never listed: it reads what it stored both ways.
    const second = savedBoard(4, { tailHardEdgeBlendsFrom: inchesToMm(16), tailHardEdgeEndsAt: inchesToMm(22) });
    expect(first.boardName).toBe(SECRET_NAME);
    const lines = tailBlendReportLines([
      { id: "a1", fields: first },
      { id: "b2", fields: second },
    ]);
    const text = lines.join("\n");
    expect(text).not.toContain(SECRET_NAME);
    expect(text).not.toContain("Secret");
    expect(lines[0]).toBe("tail-blend report: 2 saved boards; 2 open; 1 whose litres move");
    const move = tailBlendLitresMove(first)!;
    expect(lines[1]).toContain("a1: blends from ");
    expect(lines[1]).toContain(` — ${move.before.toFixed(2)} → ${move.after.toFixed(2)} L (${signed(move.after - move.before)})`);
    expect(lines.some((l) => l.startsWith("b2: "))).toBe(false);
    // Every printed line is a count, an id with its settings and litres, or the largest move.
    for (const line of lines.slice(1)) {
      expect(line).toMatch(/^a1: blends from .+ → .+ · ends at .+ → .+ — \d+\.\d\d → \d+\.\d\d L \([+-]?\d+\.\d{4}\)$|^largest move: /);
    }
  });

  it("marks a setting the board stores as its own, with no (default)", () => {
    const { fields } = MOVING[0];
    const only = { ...fields, rails: { ...fields.rails, tailHardEdgeEndsAt: inchesToMm(26) } };
    const [, line] = tailBlendReportLines([{ id: "c3", fields: only }]);
    expect(line).toContain(`blends from ${formatDim(inchesToMm(18), "imperial")} → ${formatDim(inchesToMm(12), "imperial")} (default) · ends at ${formatDim(inchesToMm(26), "imperial")} → ${formatDim(inchesToMm(26), "imperial")} — `);
  });
});
