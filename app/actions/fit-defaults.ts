"use server";

/**
 * Server Action for saving a shaper's five fit and tip defaults to their account (D-09): Extra
 * Length, Extra Center Thickness and Width Margin (which decide the blanks a board fits into), and
 * the Nose and Tail Tip thicknesses a new board starts from. Copies
 * `app/actions/print-instructions.ts`'s shape: `await auth()` runs before any database statement,
 * and the parameter list never accepts a user id, owner id or Clerk id from the client — the
 * writing identity always comes from the session. Mechanically enforced by
 * `lib/db/ownership.test.ts`.
 *
 * A signed-out caller is not an error here: a signed-out shaper's defaults live entirely in the
 * browser/cookie, so this action resolves quietly instead of throwing when there is no session.
 */

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema";
import {
  fitDefaultsInsertColumns,
  fitDefaultsUpdateSet,
  parseFitDefaultsPatch,
  type FitDefaultsPatch,
} from "@/lib/fit-defaults-preference";

/**
 * Saves a CHANGE to the shaper's fit and tip defaults: only the settings `patch` carries are
 * written; a setting it does not carry is never touched, so a pick made on one device can't wipe a
 * setting chosen on another (WR-02). Restore Defaults sends all five as `null` on purpose.
 *
 * `patch` arrives over the wire from a client component, so it is checked whole before anything
 * is written (`parseFitDefaultsPatch`): if it is not an object, names any key that is not one of
 * the five settings, or carries a value that is neither `null` nor a finite number of millimetres
 * inside that setting's bounds, nothing is written at all — a crafted call can't put arbitrary
 * content into these columns, and a half-valid call can't write half a change.
 *
 * The UPDATE of an existing row sets only the present columns plus `updatedAt`
 * (`fitDefaultsUpdateSet`); a first-time INSERT fills every absent setting with `null`
 * ("not chosen").
 */
export async function saveFitDefaultsPreference(patch: FitDefaultsPatch): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  const parsed = parseFitDefaultsPatch(patch);
  if (parsed === null || Object.keys(parsed).length === 0) return;

  await db.insert(userPreferences)
    .values({ clerkUserId: userId, ...fitDefaultsInsertColumns(parsed) })
    .onConflictDoUpdate({
      target: userPreferences.clerkUserId,
      set: fitDefaultsUpdateSet(parsed, new Date()),
    });
}
