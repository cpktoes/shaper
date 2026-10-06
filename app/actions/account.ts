"use server";

/**
 * Server Actions behind the Your data page in Clerk's account panel (quick 261006-g4u, 2026-10-06):
 * the two things the Privacy Policy promises a signed-in shaper, section 6. Copies
 * `app/actions/rack-order.ts`'s shape: `await auth()` runs before any database statement, and no
 * parameter ever accepts a user id, owner id or Clerk id from the browser — who is asking always
 * comes from the sign-in session. Mechanically enforced by `lib/db/ownership.test.ts` (D-07).
 *
 * Nothing here logs a caught error: a Drizzle or Clerk error message can carry the account id
 * (the same rule lib/clerk-webhook.ts follows).
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { deleteAccountData } from "@/lib/db/account-deletion";
import { models, userPreferences } from "@/lib/db/schema";
import {
  buildDesignsExport,
  isDeleteConfirmed,
  type DeleteMyAccountResult,
  type ExportMyDesignsResult,
} from "@/lib/account/account-data";

/**
 * Export my designs (D-02): every saved board of the signed-in shaper and their settings row, as
 * stored, built into the download file by `buildDesignsExport`. Signed out, nothing is read and
 * the answer is `exported: false`. A database failure rejects; the page says the export failed.
 */
export async function exportMyDesigns(): Promise<ExportMyDesignsResult> {
  const { userId } = await auth();
  if (!userId) return { exported: false };

  const rows = await db.select()
    .from(models)
    .where(eq(models.clerkUserId, userId));
  const preferenceRows = await db.select()
    .from(userPreferences)
    .where(eq(userPreferences.clerkUserId, userId))
    .limit(1);

  return { exported: true, file: buildDesignsExport(rows, preferenceRows[0] ?? null, new Date()) };
}

/**
 * Delete my account (D-03), in this order, and never another:
 *
 * 1. Who is asking comes from the sign-in session alone. Signed out, nothing happens.
 * 2. The typed word is checked again here, so a request that skipped the page's confirmation
 *    removes nothing (`not-confirmed`).
 * 3. The shaper's saved boards and settings leave the database in ONE all-or-nothing batch
 *    (`deleteAccountData`, the same delete Clerk's user.deleted message runs). If it fails it
 *    rejects with nothing removed, and the page says so.
 * 4. Only then is the account closed in Clerk. Data goes first so this action itself guarantees
 *    the rows are gone, even where Clerk's message can never arrive (the local dev server). If
 *    Clerk refuses, the answer is `account-not-closed`: the boards and settings are already gone,
 *    and pressing again is safe — step 3 then finds nothing and step 4 is retried. Clerk's later
 *    user.deleted message likewise finds nothing and is answered as handled.
 */
export async function deleteMyAccount(confirmation: string): Promise<DeleteMyAccountResult> {
  const { userId } = await auth();
  if (!userId) return { deleted: false, reason: "signed-out" };

  if (typeof confirmation !== "string" || !isDeleteConfirmed(confirmation)) {
    return { deleted: false, reason: "not-confirmed" };
  }

  await deleteAccountData(db, userId);

  try {
    await (await clerkClient()).users.deleteUser(userId);
  } catch {
    // Not logged: Clerk's error can carry the account id.
    return { deleted: false, reason: "account-not-closed" };
  }

  return { deleted: true };
}
