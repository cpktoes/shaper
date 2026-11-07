import { describe, expect, it } from "vitest";
import { buildDesignsExport } from "@/lib/account/account-data";
import type { ModelRow } from "@/lib/db/schema";
import {
  BOARD_FILE_EXTENSION,
  BOARD_FILE_MAX_BYTES,
  BOARD_NAME_MAX_LENGTH,
  UNTITLED_BOARD_NAME,
  boardFileName,
  boardFileStem,
  boardFileText,
  buildBoardFile,
  readOneBoardFile,
} from "./board-file";
import {
  SNAPSHOT_BOARD_LENGTH_MM,
  buildSnapshot,
  hasPhase11Blank,
  parseSnapshot,
  type DesignSnapshotFields,
} from "./design-snapshot";
import { standInRackRows } from "./rack-stand-in";

/**
 * Quick 261103-k8o (2026-11-03): one board saved as a file, to keep or to send to a friend, and the
 * reader Open a board file… uses on the home page (R1a). The founder: "I can download my board data
 * from the site, but I need a way to upload it (or send a board to a friend)."
 *
 * Every board here is a practice-rack board read through the app's own save reader, and every
 * expected value is a reading of the app's own functions — a round trip through real file text, or
 * an equality between two readings. The only typed figures are this plan's own caps (PC2, PC3, PC4).
 */

const NOW = new Date("2026-11-03T09:30:00.000Z");

const BOARDS = standInRackRows(30).map((row) => ({ name: row.name, fields: parseSnapshot(row.snapshot) }));
const FISH = BOARDS[1];

/** What a picked file's text is: the file written exactly as the download writes it. */
function fileTextFor(name: string, fields: DesignSnapshotFields): string {
  return boardFileText(buildBoardFile(name, fields, NOW));
}

/** A one-board file with its board swapped for `board` — for files the app would never write. */
function fileTextWithBoard(board: unknown): string {
  return JSON.stringify({ ...buildBoardFile(FISH.name, FISH.fields, NOW), board });
}

/** Fake saved-board rows for an Export my designs file, as lib/account/account-data.test.ts builds them. */
function fakeRows(count: number): ModelRow[] {
  return standInRackRows(count).map((row, i) => ({
    id: `0000000${i}-0000-4000-8000-000000000000`,
    clerkUserId: "user_fake_k8o",
    name: row.name,
    snapshot: row.snapshot,
    createdAt: new Date(NOW.getTime() - (i + 1) * 60_000),
    updatedAt: NOW,
    locked: null,
  }));
}

function designsFileText(count: number, settings: unknown = null): string {
  return JSON.stringify({ ...buildDesignsExport(fakeRows(count), null, NOW), settings }, null, 2);
}

describe("buildBoardFile: the board and nothing else (PC1, T-k8o-03)", () => {
  it("holds about, fileVersion, kind, exportedAt and the board, in that order", () => {
    const file = buildBoardFile(FISH.name, FISH.fields, NOW);
    expect(Object.keys(file)).toEqual(["about", "fileVersion", "kind", "exportedAt", "board"]);
    expect(Object.keys(file.board)).toEqual(["name", "design"]);
    expect(file.fileVersion).toBe(1);
    expect(file.kind).toBe("board");
    expect(file.exportedAt).toBe(NOW.toISOString());
  });

  it("carries the board exactly as a save stores it, under the board's own name", () => {
    const file = buildBoardFile("Friend's Fish", FISH.fields, NOW);
    expect(file.board.name).toBe("Friend's Fish");
    expect(file.board.design).toEqual(buildSnapshot({ ...FISH.fields, boardName: "Friend's Fish" }));
  });

  it("never holds a board id, an account, a lock, a saved date or any settings", () => {
    for (const { name, fields } of BOARDS) {
      const text = fileTextFor(name, fields);
      for (const key of ["id", "clerkUserId", "locked", "createdAt", "settings"]) {
        expect(text).not.toMatch(new RegExp(`"${key}"\\s*:`));
      }
    }
  });

  it("is written with two-space indents, the way Export my designs writes its file", () => {
    const file = buildBoardFile(FISH.name, FISH.fields, NOW);
    expect(boardFileText(file)).toBe(JSON.stringify(file, null, 2));
  });
});

describe("readOneBoardFile: a saved file reads back as the same board (R1a)", () => {
  it.each(BOARDS.map((board) => [board.name, board] as const))("%s survives the round trip through file text", (_, board) => {
    const result = readOneBoardFile(fileTextFor(board.name, board.fields), {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.name).toBe(board.name);
    expect(result.fields).toEqual({ ...board.fields, boardName: board.name });
  });
});

describe("readOneBoardFile: a whole Export my designs file (PC3)", () => {
  it("with one board, opens that board", () => {
    const [row] = fakeRows(1);
    const result = readOneBoardFile(designsFileText(1), {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.name).toBe(row.name);
    expect(result.fields).toEqual({ ...parseSnapshot(row.snapshot), boardName: row.name });
  });

  it("with three boards, is refused with the count — Import my designs is the way in", () => {
    expect(readOneBoardFile(designsFileText(3), {})).toEqual({ ok: false, problem: "many-boards", count: 3 });
  });

  it("with no boards, says so", () => {
    expect(readOneBoardFile(designsFileText(0), {})).toEqual({ ok: false, problem: "no-boards" });
  });

  it("ignores the file's settings, whatever they hold", () => {
    const plain = readOneBoardFile(designsFileText(1), {});
    const nonsense = readOneBoardFile(designsFileText(1, { units: 42, rackOrder: [null], extra: "nonsense" }), {});
    const notAnObject = readOneBoardFile(designsFileText(1, "nonsense"), {});
    expect(nonsense).toEqual(plain);
    expect(notAnObject).toEqual(plain);
  });
});

describe("readOneBoardFile: every refusal, never a throw (PC3, PC4, T-k8o-01, T-k8o-02)", () => {
  it("refuses text longer than the size cap as too big", () => {
    expect(readOneBoardFile("x".repeat(BOARD_FILE_MAX_BYTES + 1), {})).toEqual({ ok: false, problem: "too-big" });
  });

  it.each([
    ["not JSON at all", "this is not a board file"],
    ["a number", "42"],
    ["an array", "[]"],
    ["null", "null"],
    ["an object of no shape of ours", JSON.stringify({ hello: "world" })],
  ])("refuses %s as not ours", (_, text) => {
    expect(readOneBoardFile(text, {})).toEqual({ ok: false, problem: "not-ours" });
  });

  it("refuses a file from a later file version as not ours", () => {
    const file = { ...buildBoardFile(FISH.name, FISH.fields, NOW), fileVersion: 2 };
    expect(readOneBoardFile(JSON.stringify(file), {})).toEqual({ ok: false, problem: "not-ours" });
    const designs = { ...JSON.parse(designsFileText(1)), fileVersion: 2 };
    expect(readOneBoardFile(JSON.stringify(designs), {})).toEqual({ ok: false, problem: "not-ours" });
  });

  it("refuses a board whose design is not a design as unreadable", () => {
    expect(readOneBoardFile(fileTextWithBoard({ name: "Fish", design: { hello: "world" } }), {})).toEqual({
      ok: false,
      problem: "unreadable",
    });
    expect(readOneBoardFile(fileTextWithBoard({ name: "Fish", design: "a board" }), {})).toEqual({
      ok: false,
      problem: "unreadable",
    });
  });

  it("refuses a board shorter than any board the app ever drew as unreadable", () => {
    const short = { ...FISH.fields, outline: { ...FISH.fields.outline, length: SNAPSHOT_BOARD_LENGTH_MM.min - 1 } };
    const text = fileTextFor(FISH.name, short as DesignSnapshotFields);
    expect(readOneBoardFile(text, {})).toEqual({ ok: false, problem: "unreadable" });
  });

  it("refuses a board whose name is not words as unreadable", () => {
    const design = buildSnapshot(FISH.fields);
    expect(readOneBoardFile(fileTextWithBoard({ name: 42, design }), {})).toEqual({ ok: false, problem: "unreadable" });
    expect(readOneBoardFile(fileTextWithBoard({ design }), {})).toEqual({ ok: false, problem: "unreadable" });
  });
});

describe("readOneBoardFile: the board's name (PC4)", () => {
  const design = buildSnapshot(FISH.fields);
  const nameOf = (name: string) => {
    const result = readOneBoardFile(fileTextWithBoard({ name, design }), {});
    if (!result.ok) throw new Error(`the file did not open: ${result.problem}`);
    return result;
  };

  it("trims the name", () => {
    expect(nameOf("  Friend's Fish  ").name).toBe("Friend's Fish");
  });

  it("cuts a long name to its first 200 letters", () => {
    const long = "a".repeat(300);
    expect(nameOf(long).name).toBe(long.slice(0, BOARD_NAME_MAX_LENGTH));
  });

  it("never splits an emoji at the cut", () => {
    const long = `${"a".repeat(BOARD_NAME_MAX_LENGTH - 1)}🏄${"b".repeat(100)}`;
    const name = nameOf(long).name;
    expect(Array.from(name)).toHaveLength(BOARD_NAME_MAX_LENGTH);
    expect(name).toBe(Array.from(long).slice(0, BOARD_NAME_MAX_LENGTH).join(""));
  });

  it("wins over the design's own board name", () => {
    const other = buildSnapshot({ ...FISH.fields, boardName: "Some Other Name" });
    const result = readOneBoardFile(fileTextWithBoard({ name: "Friend's Fish", design: other }), {});
    expect(result.ok && result.name).toBe("Friend's Fish");
    expect(result.ok && result.fields.boardName).toBe("Friend's Fish");
  });

  it("opens an empty name as an untitled board", () => {
    const result = nameOf("   ");
    expect(result.name).toBe("");
    expect(result.fields.boardName).toBe("");
  });
});

describe("readOneBoardFile: a Phase 11 blank takes the shaper's Tip Style (PC9)", () => {
  // A practice preset board with its blank's cut removed reads as a Phase 11 blank.
  const envelope = JSON.parse(JSON.stringify(buildSnapshot(BOARDS[0].fields)));
  delete envelope.design.blank.deckSkin;
  delete envelope.design.blank.tipStyle;
  delete envelope.design.blank.fineTuneSurface;
  const text = fileTextWithBoard({ name: BOARDS[0].name, design: envelope });

  it("is a Phase 11 blank", () => {
    expect(hasPhase11Blank(envelope)).toBe(true);
  });

  it("reads exactly as the save reader reads it with that Tip Style, for either Tip Style", () => {
    for (const tipStyle of ["bottom", "pinDeck"] as const) {
      const result = readOneBoardFile(text, { tipStyle });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.fields).toEqual({ ...parseSnapshot(envelope, { tipStyle }), boardName: BOARDS[0].name });
    }
  });

  it("differs between the two Tip Styles wherever the save reader itself makes them differ", () => {
    const sameInReader =
      JSON.stringify(parseSnapshot(envelope, { tipStyle: "bottom" })) ===
      JSON.stringify(parseSnapshot(envelope, { tipStyle: "pinDeck" }));
    const bottom = readOneBoardFile(text, { tipStyle: "bottom" });
    const pinDeck = readOneBoardFile(text, { tipStyle: "pinDeck" });
    expect(JSON.stringify(bottom) === JSON.stringify(pinDeck)).toBe(sameInReader);
  });
});

describe("boardFileName: a name safe on any computer (PC2)", () => {
  const base = (name: string) => {
    const fileName = boardFileName(name);
    expect(fileName.endsWith(BOARD_FILE_EXTENSION)).toBe(true);
    return fileName.slice(0, -BOARD_FILE_EXTENSION.length);
  };

  it("drops the inch mark from a board's name", () => {
    expect(boardFileName(`Fish 5'10"`)).toBe(`Fish 5'10${BOARD_FILE_EXTENSION}`);
    expect(boardFileName(`Fish 5'10"`)).toBe("Fish 5'10.shaper-board.json");
  });

  it("turns every character a computer refuses into a single space", () => {
    expect(base(`a/b\\c:d*e?f"g<h>i|j`)).toBe("a b c d e f g h i j");
    expect(base("a\u0000b\u001fc\u007fd")).toBe("a b c d");
    expect(base("a / / b")).toBe("a b");
  });

  it("trims leading dots, surrounding spaces and trailing dots", () => {
    expect(base("  ..Fish..  ")).toBe("Fish");
    expect(base(".hidden board")).toBe("hidden board");
  });

  it.each([[""], ["    "], ['/\\:*?"<>|'], ["...."]])("names %j an untitled board", (name) => {
    expect(boardFileName(name)).toBe(`${UNTITLED_BOARD_NAME}${BOARD_FILE_EXTENSION}`);
  });

  it("cuts a long name to 80 whole letters before the extension", () => {
    expect(base("a".repeat(300))).toBe("a".repeat(80));
  });

  it("never splits an emoji", () => {
    expect(base("🏄".repeat(100))).toBe("🏄".repeat(80));
  });
});

describe("boardFileStem: the one stem the board file and the CNC export share (Phase 16)", () => {
  it.each([
    [`Fish 5'10"`],
    [`a/b\\c:d*e?f"g<h>i|j`],
    ["a\u0000b\u001fc\u007fd"],
    ["  ..Fish..  "],
    [".hidden board"],
    [""],
    ["...."],
    ["a".repeat(300)],
    ["🏄".repeat(100)],
  ])("%j: the stem and the extension are the board file's name", (name) => {
    expect(`${boardFileStem(name)}${BOARD_FILE_EXTENSION}`).toBe(boardFileName(name));
  });

  it("turns refused characters into single spaces", () => {
    expect(boardFileStem(`a/b\\c:d*e?f"g<h>i|j`)).toBe("a b c d e f g h i j");
    expect(boardFileStem("../../etc/passwd")).toBe("etc passwd");
  });

  it("cuts at 80 whole letters with an emoji at the cut, never splitting it", () => {
    const name = `${"a".repeat(79)}🏄🏄🏄`;
    expect(boardFileStem(name)).toBe(`${"a".repeat(79)}🏄`);
    expect(Array.from(boardFileStem(name)).length).toBe(80);
  });

  it("names an all-dots name an untitled board", () => {
    expect(boardFileStem("....")).toBe(UNTITLED_BOARD_NAME);
    expect(boardFileStem(". . .")).toBe(UNTITLED_BOARD_NAME);
  });
});
