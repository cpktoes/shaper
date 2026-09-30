import { is } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { accountDeletionStatements, deleteAccountData } from "./account-deletion";
import * as schema from "./schema";

/**
 * TDD RED for quick 260930-ckm, Task 1: an unconnected Drizzle instance (the fit-defaults-save.test.ts
 * idiom) so the exact SQL of the two owner-scoped deletes can be pinned without dialling Neon, plus
 * a schema scan (behavior 10) that fails the moment a future table with a clerk_user_id column is
 * added without joining the deletion — the blanks catalogue, which has no owner column, must never
 * be a target.
 */

const testDb = drizzle(neon("postgresql://nobody:nothing@localhost/none"), { schema });

describe("accountDeletionStatements", () => {
  it("9. renders exactly the two pinned SQL strings, in order, each parameterised on the id", () => {
    const [modelsDelete, prefsDelete] = accountDeletionStatements(testDb, "user_test");

    expect(modelsDelete.toSQL()).toEqual({
      sql: 'delete from "models" where "models"."clerk_user_id" = $1 returning "id"',
      params: ["user_test"],
    });
    expect(prefsDelete.toSQL()).toEqual({
      sql: 'delete from "user_preferences" where "user_preferences"."clerk_user_id" = $1 returning "clerk_user_id"',
      params: ["user_test"],
    });
  });

  it("10. covers every schema table with a clerk_user_id column, and no other — the blanks catalogue is never a target", () => {
    // Each schema export is typed as its own specific PgTableWithColumns<...> shape, which TS's
    // generic variance rules won't narrow to the plain `PgTable` union `is()` checks against at
    // runtime — the cast below bridges that, not a loosening of the runtime check itself.
    const schemaTables = Object.values(schema).filter((value) => is(value, PgTable)) as unknown as PgTable[];
    const tablesWithOwner = schemaTables
      .filter((table) => getTableConfig(table).columns.some((c) => c.name === "clerk_user_id"))
      .map((table) => getTableConfig(table).name)
      .sort();

    expect(tablesWithOwner, "add the new owner-scoped table to accountDeletionStatements in lib/db/account-deletion.ts").toEqual([
      "models",
      "user_preferences",
    ]);

    const statements = accountDeletionStatements(testDb, "user_test");
    expect(
      statements.length,
      "the number of delete statements must match the number of clerk_user_id-owned tables above",
    ).toBe(tablesWithOwner.length);
  });
});

describe("deleteAccountData", () => {
  it("11. resolves { boards, settings } from the two returned row arrays, batch called once with two statements", async () => {
    const batchSpy = vi
      .spyOn(testDb, "batch")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValue([[{ id: "a" }, { id: "b" }], [{ clerkUserId: "user_test" }]] as any);

    const result = await deleteAccountData(testDb, "user_test");

    expect(result).toEqual({ boards: 2, settings: 1 });
    expect(batchSpy).toHaveBeenCalledTimes(1);
    expect(batchSpy.mock.calls[0][0]).toHaveLength(2);
    batchSpy.mockRestore();
  });

  it("12. an empty repeat delivery resolves { boards: 0, settings: 0 }", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchSpy = vi.spyOn(testDb, "batch").mockResolvedValue([[], []] as any);

    const result = await deleteAccountData(testDb, "user_test");

    expect(result).toEqual({ boards: 0, settings: 0 });
    batchSpy.mockRestore();
  });

  it("13. a batch rejection propagates so the caller can answer 500", async () => {
    const failure = new Error("Failed query: ...\nparams: [\"user_test\"]");
    const batchSpy = vi.spyOn(testDb, "batch").mockRejectedValue(failure);

    await expect(deleteAccountData(testDb, "user_test")).rejects.toThrow(failure);
    batchSpy.mockRestore();
  });
});
