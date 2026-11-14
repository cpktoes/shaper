import { describe, expect, it } from "vitest";
import { phase16LiveBoards } from "@/lib/geometry/__fixtures__/phase16-boards";
import { LIVE_DESIGN_RULES, summarizeDesign, summarizeDesignWith } from "@/lib/geometry/design";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { formatDim } from "@/lib/geometry/measure-display";
import { d30HardEdgeBlendsFrom, d30HardEdgeEndsAt } from "@/lib/geometry/rail-bands";
import { DEFAULT_FALLBACK_ROCKER } from "@/lib/geometry/rocker";
import { inchesToMm } from "@/lib/geometry/units";
import { HARD_EDGE_FADE, RAIL_CHARACTER_FADE, railCharacterDifferences } from "@/lib/geometry/volume";
import { buildSnapshot, parseSnapshot, type DesignSnapshotFields } from "./design-snapshot";
import { RAIL_CHARACTER_REPORT_NOTE, railCharacterLitresMove, railCharacterReportLines } from "./rail-character-report";

/**
 * The founder's read-only report of how far the whole rail's fade alone moves every saved board's litres (Phase 16,
 * D-32, 14 D-18). Every expected figure is worked out here from the app's own functions — go-live 1's rule and D-32's
 * by name — never typed.
 */

const BOARDS = phase16LiveBoards();
const reached = (fields: (typeof BOARDS)[number]["fields"]) =>
  railCharacterDifferences(fields.rails, "tail").some((key) => key !== "hardEdge") ||
  railCharacterDifferences(fields.rails, "nose").length > 0;
const MOVED = BOARDS.filter((b) => reached(b.fields));
const UNTOUCHED = BOARDS.filter((b) => !reached(b.fields));

const goLiveOneLitres = (fields: DesignSnapshotFields | (typeof BOARDS)[number]["fields"]) =>
  summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: HARD_EDGE_FADE }).volumeLitres;
const fadedLitres = (fields: DesignSnapshotFields | (typeof BOARDS)[number]["fields"]) =>
  summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: RAIL_CHARACTER_FADE }).volumeLitres;

const WORDS: Record<string, string> = {
  hardEdge: "Hard Edge",
  family: "Family",
  symmetrical: "Symmetrical",
  singleTuck: "Single Tuck",
  sharpBottomTuck: "Sharp Bottom Tuck",
};
const words = (keys: readonly string[]) => (keys.length ? keys.map((k) => WORDS[k]).join(", ") : "same as the centre");

/** A saved board as the site stores it, under a name the report must never print, read back the way the check
 * reads every board. */
const SECRET_NAME = "Chris's Secret Fish";
function savedBoard(label: string, extra: Partial<DesignSnapshotFields["rails"]> = {}): DesignSnapshotFields {
  const { fields } = BOARDS.find((b) => b.label === label)!;
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

describe("railCharacterLitresMove", () => {
  it("is null for every board whose tail differs in at most the Hard Edge and whose nose not at all", () => {
    expect(UNTOUCHED.map((b) => b.label)).toEqual(
      BOARDS.filter((b) => /^(aligned|stock)\|/.test(b.label)).map((b) => b.label),
    );
    for (const { fields } of UNTOUCHED) expect(railCharacterLitresMove(fields)).toBeNull();
  });

  it("a board it leaves out reads the same under both rules, to the last digit, its own Blends From and Ends At too", () => {
    expect(UNTOUCHED.length).toBeGreaterThan(0);
    for (const { fields } of UNTOUCHED) {
      const own = {
        ...fields,
        rails: { ...fields.rails, tailHardEdgeBlendsFrom: inchesToMm(16), tailHardEdgeEndsAt: inchesToMm(22) },
      };
      for (const board of [fields, own]) {
        expect(railCharacterLitresMove(board)).toBeNull();
        expect(fadedLitres(board)).toBe(goLiveOneLitres(board));
      }
    }
  }, 120_000);

  it("reads go-live 1's rule before and D-32 alone after, on every board D-32 reaches, never the live rule's later work", () => {
    expect(MOVED.length).toBe(BOARDS.length - UNTOUCHED.length);
    for (const { fields } of MOVED) {
      const move = railCharacterLitresMove(fields);
      expect(move).not.toBeNull();
      expect(move!.before).toBe(goLiveOneLitres(fields));
      expect(move!.after).toBe(fadedLitres(fields));
      // The tail's roll reaches every board, so a figure that held the live rule would differ here.
      expect(move!.after).not.toBe(summarizeDesign(fields).volumeLitres);
    }
  }, 120_000);
});

describe("railCharacterReportLines", () => {
  const rows = BOARDS.map(({ label, fields }) => ({ id: label, fields }));

  it("prints the counts, then one line per board it reaches with its differences and settings, sorted by the size of its move, then the largest", () => {
    const lines = railCharacterReportLines(rows);
    const moves = MOVED.map(({ label, fields }) => ({
      id: label,
      before: goLiveOneLitres(fields),
      after: fadedLitres(fields),
      tail: words(railCharacterDifferences(fields.rails, "tail")),
      nose: words(railCharacterDifferences(fields.rails, "nose")),
      // No test board stores either setting, so both read the defaults — D-30's, which this report's two rules read.
      from: formatDim(d30HardEdgeBlendsFrom(fields.rails, fields.outline.length), "imperial"),
      to: formatDim(d30HardEdgeEndsAt(fields.rails, fields.outline.length), "imperial"),
    }));
    const sorted = moves
      .map((m, index) => ({ m, index }))
      .sort((a, b) => Math.abs(b.m.after - b.m.before) - Math.abs(a.m.after - a.m.before) || a.index - b.index)
      .map(({ m }) => m);
    const signed = (d: number) => `${d > 0 ? "+" : ""}${d.toFixed(4)}`;

    expect(lines[0]).toBe(
      `rail-character report: ${BOARDS.length} saved boards; ${BOARDS.length} open; ${MOVED.length} whose tail or nose rail differs from the centre's`,
    );
    expect(lines.slice(1, 1 + MOVED.length)).toEqual(
      sorted.map(
        (m) =>
          `${m.id}: tail ${m.tail} · blends from ${m.from} (default) · ends at ${m.to} (default); nose ${m.nose} — ` +
          `${m.before.toFixed(2)} → ${m.after.toFixed(2)} L (${signed(m.after - m.before)})`,
      ),
    );
    const largest = sorted[0];
    expect(lines[1 + MOVED.length]).toBe(`largest move: ${largest.id}, ${signed(largest.after - largest.before)} L`);
    expect(lines[2 + MOVED.length]).toBe(RAIL_CHARACTER_REPORT_NOTE);
    expect(lines.length).toBe(MOVED.length + 3);
    for (const { label } of UNTOUCHED) expect(lines.some((line) => line.startsWith(`${label}:`))).toBe(false);
  }, 120_000);

  it("names each side's differences in RAILS' words, and a side with none as the same as the centre", () => {
    const lines = railCharacterReportLines(
      rows.filter((r) => ["tucked|shortboard|tail-sbt", "tucked|longboard|nose-single"].includes(r.id)),
    );
    const sbt = lines.find((l) => l.startsWith("tucked|shortboard|tail-sbt: "))!;
    expect(sbt).toMatch(/^tucked\|shortboard\|tail-sbt: tail [^;]*Sharp Bottom Tuck[^;]* · blends from /);
    const nose = lines.find((l) => l.startsWith("tucked|longboard|nose-single: "))!;
    expect(nose).toMatch(/; nose [^—]*Single Tuck[^—]* — /);
  });

  it("counts a board that did not open but never prints it with data", () => {
    const lines = railCharacterReportLines([
      { id: "board-that-broke", fields: null },
      ...rows.filter((r) => r.id === "stock|hard" || r.id === "tucked|fish|nose-sbt"),
    ]);
    expect(lines[0]).toBe(
      "rail-character report: 3 saved boards; 2 open, 1 did not open; 1 whose tail or nose rail differs from the centre's",
    );
    expect(lines.join("\n")).not.toContain("board-that-broke");
  });

  it("reads none when no board's rail differs from its centre's in more than the Hard Edge", () => {
    const lines = railCharacterReportLines(rows.filter((r) => /^(aligned|stock)\|/.test(r.id)));
    expect(lines).toEqual([
      `rail-character report: ${UNTOUCHED.length} saved boards; ${UNTOUCHED.length} open; 0 whose tail or nose rail differs from the centre's`,
      "largest move: none",
      RAIL_CHARACTER_REPORT_NOTE,
    ]);
  });

  it("on two frozen saved boards read through parseSnapshot, prints ids, settings and litres only — never a board's name", () => {
    const first = savedBoard("tucked|fish|tail-sbt");
    const second = savedBoard("tucked|longboard|tail-single", {
      tailHardEdgeBlendsFrom: inchesToMm(16),
      tailHardEdgeEndsAt: inchesToMm(22),
    });
    expect(first.boardName).toBe(SECRET_NAME);
    const lines = railCharacterReportLines([
      { id: "a1", fields: first },
      { id: "b2", fields: second },
    ]);
    const text = lines.join("\n");
    expect(text).not.toContain(SECRET_NAME);
    expect(text).not.toContain("Secret");
    expect(lines[0]).toBe("rail-character report: 2 saved boards; 2 open; 2 whose tail or nose rail differs from the centre's");
    for (const [id, fields] of [["a1", first], ["b2", second]] as const) {
      const move = railCharacterLitresMove(fields)!;
      expect(move.before).toBe(goLiveOneLitres(fields));
      expect(move.after).toBe(fadedLitres(fields));
      const line = lines.find((l) => l.startsWith(`${id}: `));
      expect(line).toContain(` — ${move.before.toFixed(2)} → ${move.after.toFixed(2)} L (`);
    }
    // The board that stores its own pair prints it as stored; the other prints the defaults, marked.
    const b2 = lines.find((l) => l.startsWith("b2: "))!;
    expect(b2).toContain(
      ` · blends from ${formatDim(inchesToMm(16), "imperial")} · ends at ${formatDim(inchesToMm(22), "imperial")}; nose `,
    );
    const a1 = lines.find((l) => l.startsWith("a1: "))!;
    expect(a1).toContain(" (default) · ends at ");
    // Every printed line is a count, an id with its differences, settings and litres, or the largest move.
    for (const line of lines.slice(1, -1)) {
      expect(line).toMatch(
        /^(a1|b2): tail .+ · blends from .+ · ends at .+; nose .+ — \d+\.\d\d → \d+\.\d\d L \([+-]?\d+\.\d{4}\)$|^largest move: /,
      );
    }
  });
});
