"use server";

/**
 * Server Action for saving the units preference to a shaper's account (UNIT-03). Follows the
 * same two properties `app/design/actions.ts`'s actions hold, mechanically enforced by
 * `lib/db/ownership.test.ts`: `await auth()` runs before any database statement, and the
 * parameter list never accepts a user id, owner id or Clerk id from the client — the writing
 * identity always comes from the session.
 *
 * Unlike `saveModel`, a signed-out caller is not an error here: the provider calls this
 * optimistically on every pick (D-11), and a signed-out shaper's pick lives entirely in the
 * browser/cookie. So this action resolves quietly instead of throwing when there is no session,
 * and the caller (the units provider) never has to distinguish "signed out" from "write
 * succeeded" — both look like a resolved promise, because neither should ever surface to the
 * shaper as a toast or a banner (D-11).
 */

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema";
import { UNITS_SYSTEMS, type UnitsSystem } from "@/lib/geometry/units";

/**
 * Upserts the shaper's units choice. `system` arrives over the wire from a client component, so
 * it is validated against the two registered systems and silently discarded if it is anything
 * else (T-05-07) — a crafted call can't write arbitrary text into the column. No `revalidatePath`
 * — the screen already switched on the client before this was ever called; a revalidation here
 * would be a pointless round trip that could only ever confirm what already happened.
 */
export async function saveUnitsPreference(system: UnitsSystem): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  if (!(UNITS_SYSTEMS as readonly string[]).includes(system)) return;

  await db.insert(userPreferences)
    .values({ clerkUserId: userId, units: system })
    .onConflictDoUpdate({
      target: userPreferences.clerkUserId,
      set: { units: system, updatedAt: new Date() },
    });
}
