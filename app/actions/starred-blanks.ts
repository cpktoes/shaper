"use server";

/**
 * Server Action for saving the blanks a shaper starred in ROCKER's PICK A BLANK popup to their
 * account (quick task 261016-usz, 2026-10-16, D-06). Copies `app/actions/blank-makers.ts`'s shape:
 * the session check (Clerk's `auth()`) runs before any database statement, and the parameter list
 * never accepts a user id, owner id or Clerk id from the client — the writing identity always comes
 * from the session.
 * Mechanically enforced by `lib/db/ownership.test.ts`.
 *
 * A signed-out caller is not an error here: a signed-out shaper's stars live entirely in this
 * browser (D-02), so this action resolves quietly instead of throwing when there is no session.
 */

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema";
import {
  parseStarredBlanksInput,
  starredBlanksJson,
  type StarredBlank,
} from "@/lib/starred-blanks-preference";

/**
 * Upserts the shaper's whole star list as one value, so the last save wins across devices (D-03).
 *
 * `starred` arrives over the wire from a client component, so it is untrusted: anything that is not
 * a list writes nothing at all (P-6); a list keeps only `[maker, name]` string pairs within the
 * catalogue's text limits, drops repeats and stops at 500 — the same allow-list the browser's own
 * copy is read through. An empty list is a real value (the last star removed) and saves as `[]`.
 * Only `starred_blanks` and `updated_at` are written. No `revalidatePath` — the star already changed
 * on the screen before this was called.
 */
export async function saveStarredBlanksPreference(starred: readonly StarredBlank[]): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  const parsed = parseStarredBlanksInput(starred);
  if (parsed === null) return;

  const value = starredBlanksJson(parsed);
  await db.insert(userPreferences)
    .values({ clerkUserId: userId, starredBlanks: value })
    .onConflictDoUpdate({
      target: userPreferences.clerkUserId,
      set: { starredBlanks: value, updatedAt: new Date() },
    });
}
