"use server";

/**
 * Server Actions for saving a board (MODL-01). Every action here re-derives the caller's
 * identity from `await auth()` before touching the database and never accepts a client-supplied
 * owner field (RESEARCH.md Pattern 2, Pitfall 3) — lib/db/ownership.test.ts holds both of those
 * properties mechanically.
 */

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { models } from "@/lib/db/schema";
import { parseSnapshot } from "@/lib/models/design-snapshot";

export interface SaveModelResult {
  id: string;
}

/**
 * Writes one board. `modelId: null` inserts a new row and returns its id; a non-null `modelId`
 * updates that row, constrained on BOTH the row id AND the owning-user column — a shaper who
 * supplies someone else's row id updates nothing rather than someone else's board (T-02-03).
 * The parameter list carries a row reference and nothing more: no user or owner field ever
 * comes from the client.
 */
export async function saveModel(
  modelId: string | null,
  name: string,
  snapshot: unknown,
): Promise<SaveModelResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Sign in to save a board.");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Board needs a name.");

  // Validated before it ever reaches the database — a malformed snapshot never gets written
  // (T-02-05).
  const design = parseSnapshot(snapshot);

  if (modelId === null) {
    const [row] = await db.insert(models)
      .values({ clerkUserId: userId, name: trimmed, snapshot: design })
      .returning({ id: models.id });
    revalidatePath("/");
    return { id: row.id };
  }

  await db.update(models)
    .set({ name: trimmed, snapshot: design, updatedAt: new Date() })
    .where(and(eq(models.id, modelId), eq(models.clerkUserId, userId)));
  revalidatePath("/");
  return { id: modelId };
}
