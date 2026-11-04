import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDesignsExport } from "@/lib/account/account-data";
import {
  boardCopyName,
  importBatches,
  orderWithImportedBoardsFirst,
  planImport,
  readDesignsFileText,
  type ImportEntry,
} from "@/lib/account/import-designs";
import { models, userPreferences, type ModelRow } from "@/lib/db/schema";
import { buildSnapshot, parseSnapshot } from "@/lib/models/design-snapshot";
import { parseRackOrderColumn, rackOrderColumnValue, type SavedRackEntry } from "@/lib/models/rack-order";
import { standInRackRows } from "@/lib/models/rack-stand-in";

/**
 * Import my designs' two Server Actions (quick 261103-k8o, plan 02) against a fake session and a fake
 * database: Clerk, `@/lib/db/client`, `next/cache` and the Tip Style lookup are all mocked, so nothing
 * here dials Neon or Clerk. The fake records every statement it is given and answers each from what it
 * is (the account's ids, the stored rack order, a new board), with a way to make a chosen board's write
 * fail or clash. The ownership rules themselves (auth first, every statement the shaper's own, no
 * update and no delete) are pinned on the source by lib/db/ownership.test.ts; these cases prove what
 * the actions write and answer — and that the page's preview says exactly what the import does.
 */

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: session.userId })),
  clerkClient: vi.fn(async () => ({ users: { deleteUser: vi.fn() } })),
}));

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const resolveCarryOverTipStyle = vi.hoisted(() => vi.fn(async () => "bottom" as const));
vi.mock("@/lib/fit-defaults-server", () => ({ resolveCarryOverTipStyle }));

type Call = { method: string; args: unknown[] };
const fake = vi.hoisted(() => {
  const state = {
    statements: [] as Call[][],
    respond: (_calls: Call[]): unknown => undefined,
  };
  /** A chain whose every method records its call and returns itself; awaiting it asks `respond`. */
  function chain(first: Call): unknown {
    const calls = [first];
    state.statements.push(calls);
    const proxy: unknown = new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === "then") {
            return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
              try {
                resolve(state.respond(calls));
              } catch (error) {
                reject(error);
              }
            };
          }
          return (...args: unknown[]) => {
            calls.push({ method: String(prop), args });
            return proxy;
          };
        },
      },
    );
    return proxy;
  }
  const db = {
    select: (...args: unknown[]) => chain({ method: "select", args }),
    insert: (...args: unknown[]) => chain({ method: "insert", args }),
    update: (...args: unknown[]) => chain({ method: "update", args }),
    delete: (...args: unknown[]) => chain({ method: "delete", args }),
  };
  return { state, db };
});
vi.mock("@/lib/db/client", () => ({ db: fake.db }));

const { importMyDesigns, listMyBoardIds } = await import("@/app/actions/account");

const SHAPER = "user_shaper";
const NOW = new Date("2026-11-03T12:00:00.000Z");

function uuidFor(i: number): string {
  return `0000a8a0-0000-4000-8000-${String(i).padStart(12, "0")}`;
}

const ROWS: ModelRow[] = standInRackRows(12).map((row, i) => ({
  id: uuidFor(i + 1),
  clerkUserId: SHAPER,
  name: row.name,
  snapshot: row.snapshot,
  createdAt: row.updatedAt,
  updatedAt: row.updatedAt,
  locked: i % 4 === 0 ? true : null,
}));
const FILE_TEXT = JSON.stringify(buildDesignsExport(ROWS, null, NOW), null, 2);

function readFile() {
  const result = readDesignsFileText(FILE_TEXT, {});
  if (!result.ok) throw new Error(result.problem);
  return result;
}

/** The fake account: its boards (id, name, last touched), its stored rack order, and what to break. */
const account = {
  boards: [] as { id: string; name: string; updatedAt: Date }[],
  rackOrder: null as string | null,
  clashIds: new Set<string>(),
  rejectNames: new Set<string>(),
  fresh: 0,
};

/** The fields of the first call named `method` in a statement. */
function argOf(calls: Call[], method: string): unknown {
  return calls.find((call) => call.method === method)?.args[0];
}

function respond(calls: Call[]): unknown {
  const [first] = calls;
  if (first.method === "select") {
    const fields = Object.keys(first.args[0] as object).sort().join(",");
    if (fields === "id") return account.boards.map((board) => ({ id: board.id }));
    if (fields === "rackOrder") return account.rackOrder === null ? [] : [{ rackOrder: account.rackOrder }];
    if (fields === "id,name,updatedAt") return account.boards.map((board) => ({ ...board }));
    throw new Error(`unexpected select of ${fields}`);
  }
  if (first.method === "insert" && first.args[0] === models) {
    const values = argOf(calls, "values") as { id?: string; name: string };
    if (account.rejectNames.has(values.name)) throw new Error("database down");
    if (values.id !== undefined && (account.clashIds.has(values.id) || account.boards.some((b) => b.id === values.id))) {
      return [];
    }
    const id = values.id ?? `ffffffff-0000-4000-8000-${String(++account.fresh).padStart(12, "0")}`;
    account.boards.push({ id, name: values.name, updatedAt: new Date(NOW.getTime() + account.fresh * 1000) });
    return [{ id }];
  }
  if (first.method === "insert" && first.args[0] === userPreferences) {
    account.rackOrder = (argOf(calls, "values") as { rackOrder: string }).rackOrder;
    return undefined;
  }
  throw new Error(`unexpected ${first.method}`);
}

/** Every statement's first call, in order. */
const verbs = () => fake.state.statements.map((calls) => calls[0].method);
/** The values of every board written, in order. */
const boardWrites = () =>
  fake.state.statements
    .filter((calls) => calls[0].method === "insert" && calls[0].args[0] === models)
    .map((calls) => argOf(calls, "values") as Record<string, unknown>);

beforeEach(() => {
  session.userId = null;
  fake.state.statements.length = 0;
  fake.state.respond = respond;
  account.boards = [];
  account.rackOrder = null;
  account.clashIds = new Set();
  account.rejectNames = new Set();
  account.fresh = 0;
  revalidatePath.mockClear();
  resolveCarryOverTipStyle.mockClear();
});

/** The file's boards as the page sends them. */
const entriesOf = (indexes: number[]): ImportEntry[] => {
  const boards = readFile().boards;
  return indexes.map((i) => ({ id: boards[i].id, name: boards[i].name, design: boards[i].design }));
};
const fieldsFor = (entry: ImportEntry, name: string) => ({ ...parseSnapshot(entry.design), boardName: name });
const putOnAccount = (entries: ImportEntry[]) => {
  for (const entry of entries) account.boards.push({ id: entry.id as string, name: entry.name, updatedAt: NOW });
};

describe("signed out, neither action touches the database", () => {
  it("listMyBoardIds and importMyDesigns", async () => {
    expect(await listMyBoardIds()).toEqual({ signedIn: false });
    expect(await importMyDesigns(entriesOf([0]), false)).toEqual({ imported: false, reason: "signed-out" });
    expect(fake.state.statements).toEqual([]);
  });
});

describe("listMyBoardIds", () => {
  it("answers the signed-in shaper's own board ids", async () => {
    session.userId = SHAPER;
    putOnAccount(entriesOf([0, 1, 2]));
    expect(await listMyBoardIds()).toEqual({ signedIn: true, ids: entriesOf([0, 1, 2]).map((e) => e.id) });
    expect(verbs()).toEqual(["select"]);
  });
});

describe("importMyDesigns", () => {
  beforeEach(() => {
    session.userId = SHAPER;
  });

  it("refuses a request that isn't a list of 1 to 25 boards with a real yes or no, before any statement", async () => {
    const one = entriesOf([0]);
    for (const [boards, includeCopies] of [
      [null, false],
      [[], false],
      [Array.from({ length: 26 }, () => one[0]), false],
      [[{ id: null, design: one[0].design }], false],
      [[{ id: 42, name: "Fish", design: one[0].design }], false],
      [one, "yes"],
    ] as const) {
      expect(await importMyDesigns(boards, includeCopies)).toEqual({ imported: false, reason: "invalid" });
    }
    expect(fake.state.statements).toEqual([]);
  });

  it("adds only the board that isn't on the account, under its own id, unlocked, and changes nothing else", async () => {
    const [there, fresh] = entriesOf([0, 1]);
    putOnAccount([there]);
    expect(await importMyDesigns([there, fresh], false)).toEqual({
      imported: true,
      added: 1,
      alreadyThere: 1,
      copies: 0,
      failed: [],
    });
    expect(boardWrites()).toEqual([
      {
        id: fresh.id,
        clerkUserId: SHAPER,
        name: fresh.name,
        snapshot: buildSnapshot(fieldsFor(fresh, fresh.name)),
        locked: false,
      },
    ]);
    expect(verbs()).not.toContain("update");
    expect(verbs()).not.toContain("delete");
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("with the box ticked, also adds the board already there as a copy, under a fresh id", async () => {
    const [there, fresh] = entriesOf([0, 1]);
    putOnAccount([there]);
    expect(await importMyDesigns([there, fresh], true)).toEqual({
      imported: true,
      added: 1,
      alreadyThere: 1,
      copies: 1,
      failed: [],
    });
    const copyName = boardCopyName(there.name);
    expect(boardWrites()).toEqual([
      { clerkUserId: SHAPER, name: copyName, snapshot: buildSnapshot(fieldsFor(there, copyName)), locked: false },
      expect.objectContaining({ id: fresh.id, name: fresh.name }),
    ]);
  });

  it("a kept id that clashes with a board elsewhere adds the board again under a fresh id", async () => {
    const [fresh] = entriesOf([1]);
    account.clashIds.add(fresh.id as string);
    expect(await importMyDesigns([fresh], false)).toEqual({ imported: true, added: 1, alreadyThere: 0, copies: 0, failed: [] });
    const writes = boardWrites();
    expect(writes).toHaveLength(2);
    expect(writes[0].id).toBe(fresh.id);
    expect(writes[1]).toEqual({
      clerkUserId: SHAPER,
      name: fresh.name,
      snapshot: buildSnapshot(fieldsFor(fresh, fresh.name)),
      locked: false,
    });
    expect(account.boards.map((board) => board.name)).toEqual([fresh.name]);
  });

  it("a board whose write fails is named, and the next board still goes in", async () => {
    const [first, second] = entriesOf([1, 2]);
    account.rejectNames.add(first.name);
    expect(await importMyDesigns([first, second], false)).toEqual({
      imported: true,
      added: 1,
      alreadyThere: 0,
      copies: 0,
      failed: [first.name],
    });
    expect(account.boards.map((board) => board.name)).toEqual([second.name]);
  });

  it("a board that can't be read is named and never written", async () => {
    const [good, bad] = entriesOf([1, 2]);
    const broken = { ...bad, design: { version: 5, design: { outline: { length: -1 } } } };
    expect(await importMyDesigns([good, broken], false)).toEqual({
      imported: true,
      added: 1,
      alreadyThere: 0,
      copies: 0,
      failed: [bad.name],
    });
    expect(boardWrites().map((values) => values.name)).toEqual([good.name]);
  });

  it("in an arranged rack, everything added stands at the front, the last added first", async () => {
    const [there, a, b] = entriesOf([0, 1, 2]);
    putOnAccount([there]);
    account.boards.push({ id: uuidFor(99), name: "Older board", updatedAt: new Date(0) });
    account.rackOrder = rackOrderColumnValue([uuidFor(99), there.id as string]);
    const stored = parseRackOrderColumn(account.rackOrder)!;
    await importMyDesigns([there, a, b], true);
    const upserts = fake.state.statements.filter((calls) => calls[0].method === "insert" && calls[0].args[0] === userPreferences);
    expect(upserts).toHaveLength(1);
    expect((argOf(upserts[0], "values") as { clerkUserId: string }).clerkUserId).toBe(SHAPER);
    const entries: SavedRackEntry[] = account.boards.map((board) => ({ kind: "saved", ...board }));
    const copyId = account.boards.find((board) => board.name === boardCopyName(there.name))!.id;
    const written = parseRackOrderColumn(account.rackOrder);
    expect(written).toEqual(orderWithImportedBoardsFirst(entries, stored, [copyId, a.id as string, b.id as string]));
    expect(written!.slice(0, 3)).toEqual([b.id, a.id, copyId]);
  });

  it("in a rack never arranged, the order is left alone", async () => {
    await importMyDesigns(entriesOf([1, 2]), false);
    expect(fake.state.statements.some((calls) => calls[0].args[0] === userPreferences)).toBe(false);
    expect(account.rackOrder).toBeNull();
  });

  it("looks up the shaper's Tip Style only when a board still carries a blank from before Phase 12", async () => {
    await importMyDesigns(entriesOf([1]), false);
    expect(resolveCarryOverTipStyle).not.toHaveBeenCalled();

    const withBlank = standInRackRows(4).find((row) => {
      const blank = (row.snapshot as { design: { blank: unknown } }).design.blank;
      return typeof blank === "object" && blank !== null;
    })!;
    const design = JSON.parse(JSON.stringify(withBlank.snapshot)) as { design: { blank: Record<string, unknown> } };
    delete design.design.blank.tipStyle;
    await importMyDesigns([{ id: null, name: withBlank.name, design }], false);
    expect(resolveCarryOverTipStyle).toHaveBeenCalledTimes(1);
  });
});

describe("the preview says exactly what the import does (the tracer, end to end)", () => {
  it("a real twelve-board download, nine of them on the account: 3 added, 9 already there, the preview's three names in order", async () => {
    session.userId = SHAPER;
    const read = readFile();
    const onAccount = read.boards.slice(0, 9).map((board) => board.id as string);
    for (const id of onAccount) account.boards.push({ id, name: "on the account", updatedAt: NOW });

    const preview = planImport(read.boards, new Set(onAccount), false);
    expect([preview.add.length, preview.alreadyThere.length, preview.copies.length]).toEqual([3, 9, 0]);

    const totals = { added: 0, alreadyThere: 0, copies: 0, failed: [] as string[] };
    for (const batch of importBatches(read.boards)) {
      const answer = await importMyDesigns(batch, false);
      if (!answer.imported) throw new Error(answer.reason);
      totals.added += answer.added;
      totals.alreadyThere += answer.alreadyThere;
      totals.copies += answer.copies;
      totals.failed.push(...answer.failed);
    }
    expect(totals).toEqual({
      added: preview.add.length,
      alreadyThere: preview.alreadyThere.length,
      copies: preview.copies.length,
      failed: [],
    });
    expect(boardWrites().map((values) => values.name)).toEqual(preview.add.map((board) => board.name));

    // The same file again: nothing is added twice.
    fake.state.statements.length = 0;
    const again = await importMyDesigns(importBatches(read.boards)[0], false);
    expect(again).toEqual({ imported: true, added: 0, alreadyThere: 12, copies: 0, failed: [] });
    expect(boardWrites()).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
});
