"use server";

/**
 * Server Action for saving the order a shaper sets on the Board Rack (Phase 15, R8, D-03). Copies
 * `app/actions/blank-makers.ts`'s shape: `await auth()` runs before any database statement, and the
 * parameter list never accepts a user id, owner id or Clerk id from the client — the writing
 * identity always comes from the session. Mechanically enforced by `lib/db/ownership.test.ts`.
 *
 * A signed-out caller is not an error here: it resolves quietly and writes nothing, so the practice
 * rack used by the browser tests moves boards without a database.
 */

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { models, userPreferences } from "@/lib/db/schema";
import { parseRackOrderInput, rackOrderColumnValue } from "@/lib/models/rack-order";

/**
 * Upserts the shaper's whole order as one value, like Units — so the last arrangement wins across
 * devices. Rejects (throws) only when the database itself fails, which the rack reports as a
 * failed save.
 *
 * `orderedIds` arrives over the wire from a client component, so it is checked whole before
 * anything is written (`parseRackOrderInput`): if it is not a list, holds more than 500 ids, holds
 * anything that is not an id of 1 to 64 characters, or names an id twice, nothing is written at all.
 * Then only ids of the shaper's OWN boards are kept, in the order given — a board id belonging to
 * someone else, or to nothing, never reaches the column. No `revalidatePath` — the rack already
 * shows the new order before this is called.
 */
export async function saveRackOrder(orderedIds: readonly string[]): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  const parsed = parseRackOrderInput(orderedIds);
  if (parsed === null) return;

  const ownRows = await db.select({ id: models.id })
    .from(models)
    .where(eq(models.clerkUserId, userId));
  const ownIds = new Set(ownRows.map((row) => row.id));
  const value = rackOrderColumnValue(parsed.filter((id) => ownIds.has(id)));

  await db.insert(userPreferences)
    .values({ clerkUserId: userId, rackOrder: value })
    .onConflictDoUpdate({
      target: userPreferences.clerkUserId,
      set: { rackOrder: value, updatedAt: new Date() },
    });
}
