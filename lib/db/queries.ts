/**
 * Plain async read functions — never Server Actions, because reads belong in Server Components
 * (RESEARCH.md Architectural Responsibility Map). `listModels` is called only from
 * app/page.tsx, a Server Component that has already derived `clerkId` itself via `await auth()`;
 * the parameter here is never client-supplied, so this file has nothing resembling a client-sent
 * owner field even though the function does take an identifier — see lib/db/ownership.test.ts's
 * "no caller-supplied owner parameter" check, which this signature is written to satisfy while
 * still scoping every read.
 */

import { desc } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { models } from "./schema";

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
