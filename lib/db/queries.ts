/**
 * Plain async read functions — never Server Actions, because reads belong in Server Components
 * (RESEARCH.md Architectural Responsibility Map). `listModels` is called only from
 * app/page.tsx, a Server Component that has already derived `clerkId` itself via `await auth()`;
 * the parameter here is never client-supplied, so this file has nothing resembling a client-sent
 * owner field even though the function does take an identifier — see lib/db/ownership.test.ts's
 * "no caller-supplied owner parameter" check, which this signature is written to satisfy while
 * still scoping every read.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "./client";
import { models, userPreferences } from "./schema";
import { parseUnitsPreference } from "@/lib/units-preference";
import type { UnitsSystem } from "@/lib/geometry/units";

export interface ListedModel {
  id: string;
  name: string;
  snapshot: unknown;
  updatedAt: Date;
}

/**
 * Every saved board for one shaper, newest-touched first (id descending as the tiebreak so the
 * order is stable across renders of the same second).
 *
 * Read-only contract: this function performs a `select` and nothing else — no counters, no
 * last-viewed stamp, no write of any kind — so calling it twice returns the same rows and
 * changes nothing in the database. That also means the rack reflects rows committed as of the
 * page render that called this: a change made to a board from another tab or another device
 * shows up only on the next navigation here. This phase promises no live cross-tab sync.
 */
export async function listModels(clerkId: string): Promise<ListedModel[]> {
  return db.select({
      id: models.id,
      name: models.name,
      snapshot: models.snapshot,
      updatedAt: models.updatedAt,
    })
    .from(models)
    .where(eq(models.clerkUserId, clerkId))
    .orderBy(desc(models.updatedAt), desc(models.id));
}

/**
 * A shaper's saved units preference, or `null` when the row is missing (no preferences row yet
 * — the account has never had anything written to it) or when its `units` column holds
 * anything outside the two registered systems (a hand-edit, a legacy value, table drift). The
 * value is run through `parseUnitsPreference`'s allow-list rather than trusted as-is, so a junk
 * column value reads as "no choice" and renders Imperial instead of crashing or being honored.
 *
 * Read-only contract, same register as `listModels`: one `select`, no counters, no last-seen
 * stamp, no write of any kind.
 */
export async function readUnitsPreference(clerkId: string): Promise<UnitsSystem | null> {
  const [row] = await db.select({ units: userPreferences.units })
    .from(userPreferences)
    .where(eq(userPreferences.clerkUserId, clerkId));
  return parseUnitsPreference(row?.units ?? null);
}
