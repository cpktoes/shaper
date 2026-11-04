import { describe, expect, it } from "vitest";
import { buildDesignsExport } from "@/lib/account/account-data";
import type { ModelRow } from "@/lib/db/schema";
import {
  BOARD_FILE_MAX_BYTES,
  UNTITLED_BOARD_NAME,
  boardFileText,
  buildBoardFile,
} from "@/lib/models/board-file";
import { SNAPSHOT_BOARD_LENGTH_MM, parseSnapshot } from "@/lib/models/design-snapshot";
import { orderWithNewBoardFirst, type SavedRackEntry } from "@/lib/models/rack-order";
import { standInRackRows } from "@/lib/models/rack-stand-in";
import {
  IMPORT_BATCH_MAX_BOARDS,
  IMPORT_BATCH_MAX_CHARS,
  IMPORT_BOARD_MAX_CHARS,
  IMPORT_MAX_BOARDS,
  boardCopyName,
  boardIdOf,
  importBatches,
  orderWithImportedBoardsFirst,
  parseImportRequest,
  planImport,
  readDesignsFileText,
  readImportEntries,
  type ImportBoard,
} from "./import-designs";

/**
 * Quick 261103-k8o, plan 02 (2026-11-03): Import my designs on the Your data page takes back a whole
 * Export my designs file (R1b). The founder: "I can download my board data from the site, but I need
 * a way to upload it." Before anything is written the page says what will happen (R3), and nothing on
 * the account is ever changed.
 *
 * Every file here is the very text Export my designs downloads, built from practice-rack boards by the
 * app's own `buildDesignsExport`, and every expected value is a reading of the app's own functions or
 * a count. The only typed figures are this plan's own caps (PC16).
 */

const NOW = new Date("2026-11-03T12:00:00.000Z");
const ACCOUNT = "user_fake_k8o";

/** A board id in the form the database gives one, from its place in the list. */
function uuidFor(i: number): string {
  return `0000a8a0-0000-4000-8000-${String(i).padStart(12, "0")}`;
}

/** Practice-rack boards as saved rows of one account, each with an id in the database's form. */
function rowsFor(count: number): ModelRow[] {
  return standInRackRows(count).map((row, i) => ({
    id: uuidFor(i + 1),
    clerkUserId: ACCOUNT,
    name: row.name,
    snapshot: row.snapshot,
    createdAt: row.updatedAt,
    updatedAt: row.updatedAt,
    locked: i % 3 === 0 ? true : null,
  }));
}

const ROWS = rowsFor(12);
const EXPORT = buildDesignsExport(ROWS, null, NOW);
/** The file exactly as Export my designs downloads it. */
const FILE_TEXT = JSON.stringify(EXPORT, null, 2);

/** An export file's text with its boards changed by `edit`. */
function editedFileText(edit: (file: ReturnType<typeof structuredCloneExport>) => void): string {
  const file = structuredCloneExport();
  edit(file);
  return JSON.stringify(file, null, 2);
}

function structuredCloneExport() {
  return JSON.parse(FILE_TEXT) as {
    boards: { id: unknown; name: unknown; design: { design: { outline: { length: number } } } & Record<string, unknown> }[];
    settings: unknown;
  } & Record<string, unknown>;
}

function readOk(text: string) {
  const result = readDesignsFileText(text, {});
  if (!result.ok) throw new Error(`expected the file to read, got ${result.problem}`);
  return result;
}

describe("readDesignsFileText — a whole Export my designs file, read before anything is shown", () => {
  it("reads every board in the file's order, each with its place, its id, its name and its design as the save reader reads it", () => {
    const result = readOk(FILE_TEXT);
    expect(result.unreadable).toEqual([]);
    expect(result.boards.map((board) => board.name)).toEqual(EXPORT.boards.map((board) => board.name));
    result.boards.forEach((board, i) => {
      expect(board.position).toBe(i + 1);
      expect(board.id).toBe(EXPORT.boards[i].id);
      expect(board.fields).toEqual({ ...parseSnapshot(EXPORT.boards[i].design), boardName: board.name });
      expect(board.design).toEqual(EXPORT.boards[i].design);
    });
  });

  it("never reads the file's settings: nonsense there changes nothing", () => {
    const withNonsense = editedFileText((file) => {
      file.settings = { units: "furlongs", rackOrder: 42, tipStyle: { not: "a style" } };
    });
    expect(readOk(withNonsense)).toEqual(readOk(FILE_TEXT));
  });

  it("an id in capitals reads in small letters", () => {
    const text = editedFileText((file) => {
      file.boards[0].id = String(file.boards[0].id).toUpperCase();
    });
    expect(readOk(text).boards[0].id).toBe(EXPORT.boards[0].id);
  });

  it("an empty name reads as an untitled board, and the design's own name says the same", () => {
    const text = editedFileText((file) => {
      file.boards[2].name = "   ";
    });
    const board = readOk(text).boards[2];
    expect(board.name).toBe(UNTITLED_BOARD_NAME);
    expect(board.fields.boardName).toBe(UNTITLED_BOARD_NAME);
  });

  it("a board that can't be read is named and skipped, and every other board still reads", () => {
    const text = editedFileText((file) => {
      file.boards[1].design.design.outline.length = SNAPSHOT_BOARD_LENGTH_MM.min - 1;
      file.boards[4].design.padding = "x".repeat(IMPORT_BOARD_MAX_CHARS);
      file.boards[6].name = 7;
    });
    const result = readOk(text);
    expect(result.unreadable).toEqual([EXPORT.boards[1].name, EXPORT.boards[4].name, "board 7"]);
    expect(result.boards.map((board) => board.name)).toEqual(
      EXPORT.boards.filter((_, i) => i !== 1 && i !== 4 && i !== 6).map((board) => board.name),
    );
    expect(result.boards.map((board) => board.position)).toEqual([1, 3, 4, 6, 8, 9, 10, 11, 12]);
  });

  it("an id that isn't a board's, or repeats an earlier board's, reads as no id", () => {
    const text = editedFileText((file) => {
      file.boards[0].id = "stand-in-01";
      file.boards[3].id = file.boards[2].id;
      file.boards[5].id = undefined;
    });
    const boards = readOk(text).boards;
    expect(boards[0].id).toBeNull();
    expect(boards[2].id).toBe(EXPORT.boards[2].id);
    expect(boards[3].id).toBeNull();
    expect(boards[5].id).toBeNull();
    expect(boards[1].id).toBe(EXPORT.boards[1].id);
  });

  it("refuses a file that is too big, one that isn't ours, one with no boards and one with too many", () => {
    expect(readDesignsFileText("x".repeat(BOARD_FILE_MAX_BYTES + 1), {})).toEqual({ ok: false, problem: "too-big" });
    expect(readDesignsFileText("my shopping list", {})).toEqual({ ok: false, problem: "not-ours" });
    expect(readDesignsFileText(JSON.stringify({ surfboards: [1, 2] }), {})).toEqual({ ok: false, problem: "not-ours" });
    expect(readDesignsFileText(JSON.stringify(buildDesignsExport([], null, NOW)), {})).toEqual({
      ok: false,
      problem: "no-boards",
    });
    const many = editedFileText((file) => {
      file.boards = Array.from({ length: IMPORT_MAX_BOARDS + 1 }, (_, i) => ({ ...file.boards[i % 12], id: uuidFor(i + 1) }));
    });
    expect(readDesignsFileText(many, {})).toEqual({ ok: false, problem: "too-many-boards" });
  });

  it("also takes a one-board file, as one board with no id", () => {
    const row = ROWS[3];
    const fields = parseSnapshot(row.snapshot);
    const result = readOk(boardFileText(buildBoardFile(row.name, fields, NOW)));
    expect(result.boards).toHaveLength(1);
    expect(result.boards[0].id).toBeNull();
    expect(result.boards[0].name).toBe(row.name);
    expect(result.boards[0].fields).toEqual({ ...fields, boardName: row.name });
  });
});

describe("boardIdOf — only a board id in the database's own form is kept", () => {
  it("reads a board id in capitals in small letters, and anything else as no id", () => {
    expect(boardIdOf(uuidFor(5).toUpperCase())).toBe(uuidFor(5));
    expect(boardIdOf(uuidFor(5))).toBe(uuidFor(5));
    for (const bad of ["stand-in-01", "", 42, null, undefined, `${uuidFor(5)}0`, { id: uuidFor(5) }]) {
      expect(boardIdOf(bad)).toBeNull();
    }
  });
});

describe("planImport — what will be added, what is already on the account, and the copies (R3)", () => {
  const boards = readOk(FILE_TEXT).boards;
  const onAccount = new Set(boards.slice(0, 9).map((board) => board.id as string));

  it("with the box off: the three new boards are added and the nine already there are left alone", () => {
    const plan = planImport(boards, onAccount, false);
    expect(plan.add.map((board) => board.name)).toEqual(boards.slice(9).map((board) => board.name));
    expect(plan.alreadyThere.map((board) => board.name)).toEqual(boards.slice(0, 9).map((board) => board.name));
    expect(plan.copies).toEqual([]);
    expect(plan.writes).toEqual(
      boards.slice(9).map((board) => ({ kind: "new", keepId: board.id, name: board.name, board })),
    );
  });

  it("with the box on: the nine already there are also added as copies, named as Duplicate names one, in the file's order", () => {
    const plan = planImport(boards, onAccount, true);
    expect(plan.copies).toEqual(plan.alreadyThere);
    expect(plan.copies).toHaveLength(9);
    expect(plan.writes).toEqual(
      boards.map((board, i) =>
        i < 9
          ? { kind: "copy", name: boardCopyName(board.name), board }
          : { kind: "new", keepId: board.id, name: board.name, board },
      ),
    );
  });

  it("a board with no id is always added, and nothing is ever dropped", () => {
    const noIds = boards.map((board, i) => (i % 2 === 0 ? { ...board, id: null } : board));
    for (const includeCopies of [false, true]) {
      const plan = planImport(noIds, onAccount, includeCopies);
      expect(plan.add.length + plan.alreadyThere.length).toBe(boards.length);
      for (const board of noIds.filter((candidate) => candidate.id === null)) expect(plan.add).toContain(board);
      const keptless = plan.writes.filter((write) => write.kind === "new" && write.keepId === null);
      expect(keptless).toHaveLength(noIds.filter((board) => board.id === null).length);
    }
  });
});

describe("boardCopyName — one copy-name rule for Duplicate and Import my designs (PC18)", () => {
  it("names a copy the way Duplicate always has", () => {
    expect(boardCopyName("Fish 5'10")).toBe("Copy of Fish 5'10");
  });
});

describe("importBatches — the import goes a few boards at a time (PC16)", () => {
  const sixty: ImportBoard[] = Array.from({ length: 5 }, () => readOk(FILE_TEXT).boards).flat();

  it("every board goes exactly once, in order, never more than the most a batch takes", () => {
    const batches = importBatches(sixty);
    expect(batches).toHaveLength(Math.ceil(sixty.length / IMPORT_BATCH_MAX_BOARDS));
    expect(batches.flat()).toEqual(sixty.map((board) => ({ id: board.id, name: board.name, design: board.design })));
    for (const batch of batches) expect(batch.length).toBeLessThanOrEqual(IMPORT_BATCH_MAX_BOARDS);
  });

  it("never sends more design text in one batch than a batch takes, unless the batch holds a single board", () => {
    const one = readOk(FILE_TEXT).boards[0];
    const heavyText = JSON.stringify(one.design).length;
    const heavy: ImportBoard[] = Array.from({ length: Math.ceil((IMPORT_BATCH_MAX_CHARS * 2.5) / heavyText) }, () => one);
    const batches = importBatches(heavy);
    expect(batches.flat()).toHaveLength(heavy.length);
    expect(batches.length).toBeGreaterThan(1);
    for (const batch of batches) {
      const text = batch.reduce((sum, entry) => sum + JSON.stringify(entry.design).length, 0);
      if (batch.length > 1) expect(text).toBeLessThanOrEqual(IMPORT_BATCH_MAX_CHARS);
    }
  });
});

describe("parseImportRequest — what the server takes from the page, untrusted again", () => {
  const entries = importBatches(readOk(FILE_TEXT).boards)[0];

  it("refuses anything that isn't a list of one to the most a batch takes, each a name and an id or none, with a real yes or no for copies", () => {
    const tooMany = Array.from({ length: IMPORT_BATCH_MAX_BOARDS + 1 }, () => entries[0]);
    for (const [boards, includeCopies] of [
      [null, false],
      ["boards", false],
      [{ 0: entries[0] }, false],
      [[], false],
      [tooMany, false],
      [[{ id: null, design: entries[0].design }], false],
      [[{ id: null, name: 7, design: entries[0].design }], false],
      [[{ id: 42, name: "Fish", design: entries[0].design }], false],
      [entries, "yes"],
      [entries, 1],
      [entries, undefined],
    ] as const) {
      expect(parseImportRequest(boards, includeCopies)).toBeNull();
    }
  });

  it("takes a good request as its entries and the copies choice", () => {
    expect(parseImportRequest(entries, true)).toEqual({ entries, includeCopies: true });
    expect(parseImportRequest(entries, false)).toEqual({ entries, includeCopies: false });
  });
});

describe("readImportEntries — the server reads every board again by the page's own rule", () => {
  it("reads what the page read, and names a board that can't be read", () => {
    const boards = readOk(FILE_TEXT).boards;
    const entries = importBatches(boards)[0];
    // The save reader fills a missing part from the app's defaults, so a board is broken by a length
    // shorter than any board can be, exactly as the file case above breaks one.
    const brokenDesign = JSON.parse(JSON.stringify(entries[2].design)) as { design: { outline: { length: number } } };
    brokenDesign.design.outline.length = SNAPSHOT_BOARD_LENGTH_MM.min - 1;
    const broken = { ...entries[2], design: brokenDesign };
    const result = readImportEntries([entries[0], entries[1], broken, entries[3]], {});
    expect(result.failed).toEqual([entries[2].name]);
    expect(result.boards.map((board) => [board.id, board.name, board.fields])).toEqual(
      [boards[0], boards[1], boards[3]].map((board) => [board.id, board.name, board.fields]),
    );
  });
});

describe("orderWithImportedBoardsFirst — everything an import adds stands at the front of an arranged rack (PC17)", () => {
  it("puts the last added first, and leaves every other board where a save would", () => {
    const entries: SavedRackEntry[] = ROWS.map((row) => ({ kind: "saved", id: row.id, name: row.name, updatedAt: row.updatedAt }));
    const stored = ROWS.slice(0, 8).map((row) => row.id).reverse();
    const [a, b, c] = [ROWS[9].id, ROWS[10].id, ROWS[11].id];
    const order = orderWithImportedBoardsFirst(entries, stored, [a, b, c]);
    expect(order.slice(0, 3)).toEqual([c, b, a]);
    const folded = [a, b, c].reduce<string[]>((list, id) => orderWithNewBoardFirst(entries, list, id), stored);
    expect(order).toEqual(folded);
    expect(order.slice(3)).toEqual(orderWithNewBoardFirst(entries, stored, a).filter((id) => id !== a && id !== b && id !== c));
  });
});
