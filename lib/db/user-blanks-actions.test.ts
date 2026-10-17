import { beforeEach, describe, expect, it, vi } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { normalizeSpec, type BlankRockerSpec } from "@/lib/geometry/custom-rocker";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { inchesToMm } from "@/lib/geometry/units";
import { SAVED_BLANKS_FULL_MESSAGE, SAVED_BLANKS_MAX } from "@/lib/saved-blanks-preference";

/**
 * The saved blanks' Server Actions (quick 261016-mkb, D-09) against a fake session and a fake
 * database: Clerk's `auth()` and `@/lib/db/client` are both mocked, so nothing here dials Neon or
 * Clerk. The fake database records every call it is given and answers from a queue the case sets.
 * The ownership rules themselves (auth first, every statement owner-scoped) are pinned on the
 * source by lib/db/ownership.test.ts; these cases prove what each action answers.
 */

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(async () => ({ userId: session.userId })) }));

type Call = { method: string; args: unknown[] };
const fake = vi.hoisted(() => {
  const state = {
    calls: [] as Call[],
    results: [] as unknown[],
    throwOnSelect: false,
  };
  /** A chain whose every method records its call and returns itself; awaiting it takes the next queued result. */
  function chain(first: Call): unknown {
    state.calls.push(first);
    const result = state.results.shift();
    const target: Record<string, unknown> = {};
    const proxy: unknown = new Proxy(target, {
      get(_, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
            if (first.method === "select" && state.throwOnSelect) reject(new Error("database down"));
            else resolve(result);
          };
        }
        return (...args: unknown[]) => {
          state.calls.push({ method: String(prop), args });
          return proxy;
        };
      },
    });
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

const { listSavedBlanks, removeUserBlank, saveUserBlank, updateUserBlank } = await import("@/app/actions/user-blanks");

const COPY = presetDesignFields(BOARD_PRESETS.find((p) => p.id === "longboard")!).blank!.copy;
const ROCKER: BlankRockerSpec = { changes: [{ end: "nose", amount: inchesToMm(0.5), fromTip: inchesToMm(18) }] };
const INPUT = { copy: COPY, rocker: ROCKER };
const ROW_ID = "3f1c2b7e-8a4d-4c5e-9f00-112233445566";

beforeEach(() => {
  session.userId = null;
  fake.state.calls.length = 0;
  fake.state.results.length = 0;
  fake.state.throwOnSelect = false;
});

describe("signed out, every action answers without touching the database", () => {
  it("list, save, update and remove", async () => {
    expect(await listSavedBlanks()).toEqual({ signedIn: false });
    expect(await saveUserBlank(INPUT)).toEqual({ ok: false, reason: "signed-out" });
    expect(await updateUserBlank(ROW_ID, INPUT)).toEqual({ ok: false, reason: "signed-out" });
    expect(await removeUserBlank(ROW_ID)).toEqual({ ok: false, reason: "signed-out" });
    expect(fake.state.calls).toEqual([]);
  });
});

describe("saveUserBlank", () => {
  beforeEach(() => {
    session.userId = "user_shaper";
  });

  it("refuses an input that does not read before any statement", async () => {
    for (const bad of [null, "blank", { copy: COPY }, { copy: COPY, rocker: { changes: [] } }, { copy: { name: "x" }, rocker: ROCKER }]) {
      expect(await saveUserBlank(bad)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(fake.state.calls).toEqual([]);
  });

  it(`refuses a save at ${SAVED_BLANKS_MAX} saved blanks, with the sentence a shaper reads, and inserts nothing`, async () => {
    fake.state.results.push([{ n: SAVED_BLANKS_MAX }]);
    expect(await saveUserBlank(INPUT)).toEqual({ ok: false, reason: "full", message: SAVED_BLANKS_FULL_MESSAGE });
    expect(fake.state.calls.map((c) => c.method)).not.toContain("insert");
  });

  it("inserts the session's own id with the read copy and the normalised rocker, and answers the new saved blank", async () => {
    fake.state.results.push([{ n: 3 }], [{ id: ROW_ID }]);
    const result = await saveUserBlank(INPUT);
    const rocker = normalizeSpec(ROCKER, COPY.lengthMm);
    expect(result).toEqual({ ok: true, blank: { id: ROW_ID, copy: COPY, rocker } });
    const values = fake.state.calls.find((c) => c.method === "values");
    expect(values?.args[0]).toEqual({ clerkUserId: "user_shaper", copy: COPY, rocker });
  });
});

describe("updateUserBlank", () => {
  beforeEach(() => {
    session.userId = "user_shaper";
  });

  it("refuses an id that is not a uuid, and an input that does not read", async () => {
    expect(await updateUserBlank("not-a-uuid", INPUT)).toEqual({ ok: false, reason: "invalid" });
    expect(await updateUserBlank(42, INPUT)).toEqual({ ok: false, reason: "invalid" });
    expect(await updateUserBlank(ROW_ID, { copy: COPY, rocker: "bent" })).toEqual({ ok: false, reason: "invalid" });
    expect(fake.state.calls).toEqual([]);
  });

  it("answers missing when no row of the shaper's was updated", async () => {
    fake.state.results.push([]);
    expect(await updateUserBlank(ROW_ID, INPUT)).toEqual({ ok: false, reason: "missing" });
  });

  it("answers the edited blank when its row was updated", async () => {
    fake.state.results.push([{ id: ROW_ID }]);
    const result = await updateUserBlank(ROW_ID, INPUT);
    expect(result).toEqual({ ok: true, blank: { id: ROW_ID, copy: COPY, rocker: normalizeSpec(ROCKER, COPY.lengthMm) } });
  });
});

describe("removeUserBlank", () => {
  beforeEach(() => {
    session.userId = "user_shaper";
  });

  it("refuses an id that is not a uuid, else removes and answers ok", async () => {
    expect(await removeUserBlank("../models")).toEqual({ ok: false, reason: "invalid" });
    expect(fake.state.calls).toEqual([]);
    fake.state.results.push(undefined);
    expect(await removeUserBlank(ROW_ID)).toEqual({ ok: true });
    expect(fake.state.calls[0].method).toBe("delete");
  });
});

describe("listSavedBlanks", () => {
  beforeEach(() => {
    session.userId = "user_shaper";
  });

  it("reads the shaper's rows through the strict reader, dropping a row that no longer reads", async () => {
    fake.state.results.push([
      { id: ROW_ID, copy: COPY, rocker: ROCKER },
      { id: "3f1c2b7e-8a4d-4c5e-9f00-000000000000", copy: { vendor: "Nobody" }, rocker: ROCKER },
      { id: "3f1c2b7e-8a4d-4c5e-9f00-000000000001", copy: COPY, rocker: { changes: [] } },
    ]);
    expect(await listSavedBlanks()).toEqual({
      signedIn: true,
      blanks: [{ id: ROW_ID, copy: COPY, rocker: normalizeSpec(ROCKER, COPY.lengthMm) }],
    });
    expect(fake.state.calls.map((c) => c.method)).toContain("limit");
  });

  it("answers an empty, unavailable list when the database cannot be read — never rejects", async () => {
    fake.state.throwOnSelect = true;
    await expect(listSavedBlanks()).resolves.toEqual({ signedIn: true, blanks: [], unavailable: true });
  });
});
