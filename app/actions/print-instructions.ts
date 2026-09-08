"use server";

/**
 * Server Action for saving the print-instructions preference to a shaper's account (PRNT-05).
 * Copies `app/actions/units.ts`'s shape line for line: `await auth()` runs before any database
 * statement, and the parameter list never accepts a user id, owner id or Clerk id from the
 * client — the writing identity always comes from the session. Mechanically enforced by
 * `lib/db/ownership.test.ts`.
 *
 * Unlike `saveModel`, a signed-out caller is not an error here: the provider calls this
 * optimistically on every tick (D-07), and a signed-out shaper's pick lives entirely in the
 * browser/cookie. So this action resolves quietly instead of throwing when there is no session.
 */

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema";

/**
 * Upserts the shaper's print-instructions choice. `value` arrives over the wire from a client
 * component, so it is validated as a real boolean and silently discarded if it is anything else
 * — a crafted call can't write arbitrary content into the column.
 */
export async function savePrintRailInstructionsPreference(value: boolean): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  if (typeof value !== "boolean") return;

  await db.insert(userPreferences)
    .values({ clerkUserId: userId, printRailInstructions: value })
    .onConflictDoUpdate({
      target: userPreferences.clerkUserId,
      set: { printRailInstructions: value, updatedAt: new Date() },
    });
}
