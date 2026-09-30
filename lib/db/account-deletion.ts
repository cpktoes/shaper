import { eq } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { AccountDataDeleted } from "@/lib/clerk-webhook";
import * as schema from "./schema";
import { models, userPreferences } from "./schema";

/**
 * Phase 13 item 11a: the atomic delete a signed Clerk `user.deleted` message triggers. Both
 * deletes run through `database.batch`, which Neon's HTTP driver turns into ONE HTTP request and
 * ONE non-interactive Postgres transaction — never boards gone with settings left behind, or the
 * reverse (`db.transaction` throws "No transactions support in neon-http driver" on this driver,
 * so `batch` is the only way to make two statements atomic here).
 *
 * This file takes the database and the owner id as parameters and never imports "./client" —
 * that module dials Neon at module load, and a unit test importing this file statically must
 * never trigger that dial. The route passes the real `db` in.
 *
 * Unlike lib/db/queries.ts, this file's owner id comes only from a Clerk-signed webhook event,
 * never from a browser request — so it is not one of the functions lib/db/ownership.test.ts
 * guards. Trusting `clerkUserId` here is safe because the only caller (lib/clerk-webhook.ts) only
 * ever passes the id Clerk's own verified signature vouched for.
 */

export type ShaperDatabase = NeonHttpDatabase<typeof schema>;

/**
 * The two owner-scoped deletes, in the order `deleteAccountData` batches them. Every table in
 * lib/db/schema.ts with a clerk_user_id column belongs here — lib/db/account-deletion.test.ts's
 * schema scan fails the moment a future table joins that group without being added below. The
 * blanks catalogue has no owner column at all and is never a target.
 */
export function accountDeletionStatements(database: ShaperDatabase, clerkUserId: string) {
  return [
    database.delete(models).where(eq(models.clerkUserId, clerkUserId)).returning({ id: models.id }),
    database
      .delete(userPreferences)
      .where(eq(userPreferences.clerkUserId, clerkUserId))
      .returning({ clerkUserId: userPreferences.clerkUserId }),
  ] as const;
}

export async function deleteAccountData(
  database: ShaperDatabase,
  clerkUserId: string,
): Promise<AccountDataDeleted> {
  const [deletedModels, deletedPreferences] = await database.batch(
    accountDeletionStatements(database, clerkUserId),
  );
  return { boards: deletedModels.length, settings: deletedPreferences.length };
}
