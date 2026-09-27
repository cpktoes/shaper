"use server";

/**
 * Server Action for saving which blank makers a shaper has switched off in the gear menu's BLANK
 * MAKERS tick boxes (quick task 260926-wmf). Copies `app/actions/units.ts`'s shape: `await auth()`
 * runs before any database statement, and the parameter list never accepts a user id, owner id or
 * Clerk id from the client — the writing identity always comes from the session. Mechanically
 * enforced by `lib/db/ownership.test.ts`.
 *
 * A signed-out caller is not an error here: a signed-out shaper's choice lives entirely in the
 * browser/cookie, so this action resolves quietly instead of throwing when there is no session.
 */

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema";
import { hiddenBlankMakersColumnValue, parseHiddenBlankMakersInput } from "@/lib/blank-makers-preference";

/**
 * Upserts the shaper's whole list of hidden makers as one value, like Units — so the last pick
 * wins across devices.
 *
 * `hidden` arrives over the wire from a client component, so it is checked whole before anything
 * is written (`parseHiddenBlankMakersInput`): if it is not a list, names anything that is not
 * exactly one of the catalogue makers, names a maker twice, or would hide every maker, nothing is
 * written at all. The column only ever receives `hiddenBlankMakersColumnValue`'s JSON of known
 * names. No `revalidatePath` — the screen already changed on the client before this was called.
 */
export async function saveBlankMakersPreference(hidden: readonly string[]): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  const parsed = parseHiddenBlankMakersInput(hidden);
  if (parsed === null) return;

  const value = hiddenBlankMakersColumnValue(parsed);
  await db.insert(userPreferences)
    .values({ clerkUserId: userId, hiddenBlankMakers: value })
    .onConflictDoUpdate({
      target: userPreferences.clerkUserId,
      set: { hiddenBlankMakers: value, updatedAt: new Date() },
    });
}
