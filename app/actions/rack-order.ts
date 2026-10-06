"use server";

/**
 * Server Action for saving the order a shaper sets on the Board Rack (Phase 15, R8, D-03). Copies
 * `app/actions/blank-makers.ts`'s shape: `await auth()` runs before any database statement, and the
 * parameter list never accepts a user id, owner id or Clerk id from the client — the writing
 * identity always comes from the session. Mechanically enforced by `lib/db/ownership.test.ts`.
 *
 * A signed-out caller never reaches the database. On the practice rack used by the browser tests
 * (`/test-rack`, test servers only) its save goes to the practice rack's in-memory stand-in
 * (`lib/rack-stand-in-server.ts`), so the suite can prove what a shaper sees when a save lands, fails
 * or is slow; anywhere else it resolves quietly and writes nothing.
 */

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { models, userPreferences } from "@/lib/db/schema";
import { parseRackOrderInput, rackOrderColumnValue } from "@/lib/models/rack-order";
import { saveStandInRackOrder } from "@/lib/rack-stand-in-server";

/**
 * Upserts the shaper's whole order as one value, like Units — so the last arrangement wins across
 * devices. Rejects (throws) only when the database itself fails, which the rack reports as a
 * failed save.
 *
 * `orderedIds` arrives over the wire from a client component, so it is checked whole before
 * anything is written (`parseRackOrderInput`): if it is not a list, holds more than 500 ids, holds
 * anything that is not an id of 1 to 64 characters, or names an id twice, nothing is written at all.
 * Then only ids of the shaper's OWN boards are kept, in the order given — a board id belonging to
 * someone else, or to nothing, never reaches the column.
 *
 * Then the home page is refreshed (`revalidatePath("/")`, as the board actions in
 * `app/design/actions.ts` do). The rack already shows the new order, but the copy of the page Next
 * keeps for the browser's Back button still holds the order from before the move: without this, a
 * shaper who moves a board, opens one and presses Back sees the old order — and their next move
 * saves over the arrangement they lost (code review CR-01). The refresh also reaches the rack while
 * it is open; `useRackOrder` keeps a newer move on screen while that move is still saving.
 */
export async function saveRackOrder(orderedIds: readonly string[]): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    await saveStandInRackOrder(orderedIds);
    return;
  }

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
  revalidatePath("/");
}
