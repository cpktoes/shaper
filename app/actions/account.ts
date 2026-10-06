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

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { models, userPreferences } from "@/lib/db/schema";
import { buildDesignsExport, type ExportMyDesignsResult } from "@/lib/account/account-data";

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
