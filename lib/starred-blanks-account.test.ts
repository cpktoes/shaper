import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BLANK_TEXT_MAX } from "./blanks/catalog";
import { STARRED_BLANKS_MAX, starredBlanksJson, type StarredBlank } from "./starred-blanks-preference";

/**
 * Starred blanks on the shaper's account (quick 261016-usz, 2026-10-16): the save action (D-06,
 * P-6) and the server's read of the account's list (D-03, P-3). Clerk's session, the database client
 * and the account read are all stand-ins, so nothing here ever reaches a database. Made-up
 * `[maker, name]` pairs only.
 */

const mocks = vi.hoisted(() => {
  const calls: string[] = [];
  const recorded: { values: unknown[]; conflict: unknown[]; table: unknown[] } = {
    values: [],
    conflict: [],
    table: [],
  };
  const auth = vi.fn(async (): Promise<{ userId: string | null }> => {
    calls.push("auth");
    return { userId: null };
  });
  const insert = vi.fn((table: unknown) => {
    calls.push("insert");
    recorded.table.push(table);
    return {
      values: (values: unknown) => {
        recorded.values.push(values);
        return {
          onConflictDoUpdate: async (conflict: unknown) => {
            recorded.conflict.push(conflict);
          },
        };
      },
    };
  });
  const readStarredBlanksPreference = vi.fn<(clerkId: string) => Promise<StarredBlank[]>>(async () => []);
  return { calls, recorded, auth, insert, readStarredBlanksPreference };
});

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({ db: { insert: mocks.insert } }));
vi.mock("@/lib/db/queries", () => ({ readStarredBlanksPreference: mocks.readStarredBlanksPreference }));

import { saveStarredBlanksPreference } from "@/app/actions/starred-blanks";
import { userPreferences } from "@/lib/db/schema";
import { resolveStarredBlanksHandoff } from "./starred-blanks-server";

const SESSION_ID = "user_fake_session";
const ONE: StarredBlank = ["Maker A", "One"];
const TWO: StarredBlank = ["Maker B", "Two"];

function signedInAs(userId: string | null) {
  mocks.auth.mockImplementation(async () => {
    mocks.calls.push("auth");
    return { userId };
  });
}

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.recorded.values.length = 0;
  mocks.recorded.conflict.length = 0;
  mocks.recorded.table.length = 0;
  mocks.insert.mockClear();
  mocks.readStarredBlanksPreference.mockReset();
  mocks.readStarredBlanksPreference.mockImplementation(async () => []);
  signedInAs(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("saveStarredBlanksPreference (D-06, P-6)", () => {
  it("signed out, writes nothing and returns quietly", async () => {
    await expect(saveStarredBlanksPreference([ONE])).resolves.toBeUndefined();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("signed in, refuses anything that is not a list", async () => {
    signedInAs(SESSION_ID);
    for (const junk of [null, "stars", { 0: ONE }]) {
      await saveStarredBlanksPreference(junk as unknown as StarredBlank[]);
    }
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("signed in, cleans the list and upserts only the stars and the time, as the session's shaper", async () => {
    signedInAs(SESSION_ID);
    const messy = [ONE, ONE, ["Maker C", "x".repeat(BLANK_TEXT_MAX + 1)], 7, TWO] as unknown as StarredBlank[];
    await saveStarredBlanksPreference(messy);

    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.recorded.table[0]).toBe(userPreferences);
    expect(mocks.recorded.values[0]).toEqual({ clerkUserId: SESSION_ID, starredBlanks: starredBlanksJson([ONE, TWO]) });
    const conflict = mocks.recorded.conflict[0] as { target: unknown; set: Record<string, unknown> };
    expect(conflict.target).toBe(userPreferences.clerkUserId);
    expect(Object.keys(conflict.set).sort()).toEqual(["starredBlanks", "updatedAt"]);
    expect(conflict.set.starredBlanks).toBe(starredBlanksJson([ONE, TWO]));
    expect(conflict.set.updatedAt).toBeInstanceOf(Date);
  });

  it("saves an empty list as no stars", async () => {
    signedInAs(SESSION_ID);
    await saveStarredBlanksPreference([]);
    expect(mocks.recorded.values[0]).toEqual({ clerkUserId: SESSION_ID, starredBlanks: "[]" });
  });

  it("keeps at most 500 stars", async () => {
    signedInAs(SESSION_ID);
    const many = Array.from({ length: 600 }, (_, i): StarredBlank => ["Maker", `Blank ${i}`]);
    await saveStarredBlanksPreference(many);
    const saved = JSON.parse((mocks.recorded.values[0] as { starredBlanks: string }).starredBlanks) as unknown[];
    expect(saved).toHaveLength(STARRED_BLANKS_MAX);
    expect(saved).toEqual(many.slice(0, STARRED_BLANKS_MAX).map(([v, n]) => [v, n]));
  });

  it("asks who is signed in before it writes anything", async () => {
    signedInAs(SESSION_ID);
    await saveStarredBlanksPreference([ONE]);
    expect(mocks.calls).toEqual(["auth", "insert"]);
  });
});

describe("resolveStarredBlanksHandoff (D-03, P-3)", () => {
  it("signed out, hands down signed-out and never reads the account", async () => {
    await expect(resolveStarredBlanksHandoff()).resolves.toEqual({ kind: "signed-out" });
    expect(mocks.readStarredBlanksPreference).not.toHaveBeenCalled();
  });

  it("signed in, hands down the account's stars", async () => {
    signedInAs(SESSION_ID);
    mocks.readStarredBlanksPreference.mockImplementation(async () => [ONE, TWO]);
    await expect(resolveStarredBlanksHandoff()).resolves.toEqual({ kind: "signed-in", account: [ONE, TWO] });
    expect(mocks.readStarredBlanksPreference).toHaveBeenCalledWith(SESSION_ID);
  });

  it("signed in but the read fails, hands down unreadable — never 'no stars' — and never throws", async () => {
    signedInAs(SESSION_ID);
    mocks.readStarredBlanksPreference.mockImplementation(async () => {
      throw new Error("column starred_blanks does not exist");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(resolveStarredBlanksHandoff()).resolves.toEqual({ kind: "account-unreadable" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
