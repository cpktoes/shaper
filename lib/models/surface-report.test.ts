import { describe, expect, it } from "vitest";
import { phase16SurfaceBoards } from "@/lib/geometry/__fixtures__/phase16-boards";
import { LIVE_DESIGN_RULES, summarizeDesign, summarizeDesignWith } from "@/lib/geometry/design";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { DEFAULT_FALLBACK_ROCKER } from "@/lib/geometry/rocker";
import { HARD_EDGE_FADE, RAIL_CHARACTER_FADE } from "@/lib/geometry/volume";
import { buildSnapshot, parseSnapshot, type DesignSnapshotFields } from "./design-snapshot";
import { railCharacterLitresMove } from "./rail-character-report";
import { surfaceLitresMove, surfaceReportLines } from "./surface-report";

/**
 * The founder's read-only report of what every saved board will read at go-live 2 (Phase 16, D-33 to D-38, 14 D-18).
 * Every expected figure is worked out here from the app's own functions — go-live 1's rule and plan 16-15's by name,
 * the live rule by `summarizeDesign` — never typed.
 */

const BOARDS = phase16SurfaceBoards();
const beforeLitres = (fields: (typeof BOARDS)[number]["fields"]) =>
  summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: HARD_EDGE_FADE }).volumeLitres;
const fadedLitres = (fields: (typeof BOARDS)[number]["fields"]) =>
  summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: RAIL_CHARACTER_FADE }).volumeLitres;
const afterLitres = (fields: (typeof BOARDS)[number]["fields"]) => summarizeDesign(fields).volumeLitres;

/** A saved board as the site stores it, under a name the report must never print, read back the way the check
 * reads every board. */
const SECRET_NAME = "Chris's Secret Fish";
function savedBoard(label: string): DesignSnapshotFields {
  const { fields } = BOARDS.find((b) => b.label === label)!;
  const stored: DesignSnapshotFields = {
    ...fields,
    rocker: fields.rocker ?? DEFAULT_FALLBACK_ROCKER,
    blank: fields.blank ?? null,
    fins: DEFAULT_FIN_PLACEMENT_SPEC,
    finsImportTemplate: true,
    boardName: SECRET_NAME,
    finSystem: "fcs2",
  };
  return parseSnapshot(Object.freeze(JSON.parse(JSON.stringify(buildSnapshot(stored)))));
}

describe("surfaceLitresMove", () => {
  for (const board of BOARDS) {
    it(`${board.label}: reads what the site reads today, the fade alone, and go-live 2`, () => {
      const [before, faded, after] = [beforeLitres(board.fields), fadedLitres(board.fields), afterLitres(board.fields)];
      expect(surfaceLitresMove(board.fields)).toEqual({ before, faded, after });
    });
  }

  it("every one of the 102 moves, because the tail's roll reaches every board", () => {
    expect(BOARDS.filter((board) => surfaceLitresMove(board.fields))).toHaveLength(102);
  });
});

describe("the two reports together tell every board's whole move", () => {
  for (const board of BOARDS) {
    it(`${board.label}: whole move = the rail-character report's move + this plan's share`, () => {
      const surface = surfaceLitresMove(board.fields)!;
      const rail = railCharacterLitresMove(board.fields);
      if (rail) {
        expect(rail.before).toBe(surface.before);
        expect(rail.after).toBe(surface.faded);
      } else {
        // A board the rail-character report leaves out has no share of the fade: this plan is its whole move.
        expect(surface.faded).toBe(surface.before);
      }
    });
  }
});

describe("surfaceReportLines", () => {
  const rows = BOARDS.map((board) => ({ id: board.label, fields: board.fields }));
  const lines = surfaceReportLines(rows);
  const moved = BOARDS.flatMap((board) => {
    const move = surfaceLitresMove(board.fields);
    return move ? [{ board, move }] : [];
  });

  it("opens with the counts and closes with the largest move", () => {
    expect(lines[0]).toBe(`surface report: 102 saved boards; 102 open; ${moved.length} whose litres move`);
    const size = (m: (typeof moved)[number]) => Math.abs(m.move.after - m.move.before);
    const largest = moved.reduce((best, m) => (size(m) > size(best) ? m : best));
    const signed = largest.move.after - largest.move.before;
    expect(lines[lines.length - 1]).toBe(`largest move: ${largest.board.label}, ${signed > 0 ? "+" : ""}${signed.toFixed(4)} L`);
  });

  it("lists every board that moves, largest first, with its wing count, its tail kind and its litres", () => {
    const body = lines.slice(1, -1);
    expect(body).toHaveLength(moved.length);
    const sizes = body.map((line) => {
      const { board, move } = moved.find((m) => line.startsWith(`${m.board.label}: `))!;
      const count = board.fields.outline.wings?.length ?? 0;
      const wings = count === 0 ? "no wings" : count === 1 ? "1 wing" : "2 wings";
      const change = move.after - move.before;
      const share = move.after - move.faded;
      expect(line).toBe(
        `${board.label}: ${wings} · ${board.fields.outline.tail.kind} tail — ` +
          `${move.before.toFixed(2)} → ${move.after.toFixed(2)} L (${change > 0 ? "+" : ""}${change.toFixed(4)}, ` +
          `this plan ${share > 0 ? "+" : ""}${share.toFixed(4)})`,
      );
      return Math.abs(change);
    });
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  });

  it("an empty list is still a report, and says none", () => {
    expect(surfaceReportLines([])).toEqual(["surface report: 0 saved boards; 0 open; 0 whose litres move", "largest move: none"]);
  });

  it("counts a board that did not open, and prints nothing of it", () => {
    const report = surfaceReportLines([{ id: "broken-row", fields: null }]);
    expect(report).toEqual(["surface report: 1 saved boards; 0 open, 1 did not open; 0 whose litres move", "largest move: none"]);
    expect(report.join("\n")).not.toContain("broken-row");
  });

  it("two boards frozen as the site stores them print ids, wings, tails and litres — never a name", () => {
    const winged = savedBoard("wing|fish|one");
    const plain = savedBoard("shortboard|pin|hard");
    expect(winged.boardName).toBe(SECRET_NAME);
    const report = surfaceReportLines([
      { id: "board-a", fields: winged },
      { id: "board-b", fields: plain },
    ]);
    const text = report.join("\n");
    expect(report[0]).toBe("surface report: 2 saved boards; 2 open; 2 whose litres move");
    expect(text).toContain("board-a: 1 wing · swallow tail");
    expect(text).toContain("board-b: no wings · pin tail");
    expect(text).not.toContain(SECRET_NAME);
    expect(text).not.toContain("Secret");
    expect(text).not.toContain("clerk");
  });
});
