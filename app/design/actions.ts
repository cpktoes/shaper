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
import {
  buildSnapshot,
  parseSnapshot,
  type DesignSnapshotFields,
} from "@/lib/models/design-snapshot";

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

  // The client sends the raw seven design fields (design-store's `designSnapshotFields`), not
  // a versioned envelope — wrapping first, then parsing, validates the payload without asking
  // the client to know about versions. Validated before it ever reaches the database — a
  // malformed snapshot never gets written (T-02-05).
  const design = parseSnapshot(buildSnapshot(snapshot as DesignSnapshotFields));

  // What the row stores is the envelope, not the bare fields: the read path
  // (`parseSnapshot(row.snapshot)` in app/page.tsx) requires `version` to be present, and the
  // version number is what lets Phase 4 grow the format without migrating existing rows.
  // The snapshot's embedded boardName is pinned to the row's name column here at the write
  // boundary — `name` is the authoritative label, and a reopened board restores its name from
  // the snapshot, so letting the two drift would hand the shaper back a nameless board.
  const envelope = buildSnapshot({ ...design, boardName: trimmed });

  if (modelId === null) {
    const [row] = await db.insert(models)
      .values({ clerkUserId: userId, name: trimmed, snapshot: envelope })
      .returning({ id: models.id });
    revalidatePath("/");
    return { id: row.id };
  }

  // A row that no longer belongs to this shaper (deleted from another tab/device, or a stale id
  // left over from some other desync) matches nothing here — the WHERE clause already stops the
  // write from touching someone else's board, but without checking the returned row this would
  // still report success for a save that wrote nothing at all. `.returning` makes the zero-rows
  // case visible so the caller finds out its "Saved" would have been a lie, the same way
  // renameModel/duplicateModel already refuse on a source row that doesn't resolve.
  const [row] = await db.update(models)
    .set({ name: trimmed, snapshot: envelope, updatedAt: new Date() })
    .where(and(eq(models.id, modelId), eq(models.clerkUserId, userId)))
    .returning({ id: models.id });
  if (!row) throw new Error("Couldn't find that board.");
  revalidatePath("/");
  return { id: row.id };
}

/**
 * Renames one board (D-13). Constrained on BOTH the row id AND the owning-user column, exactly
 * like `saveModel`'s update — a shaper passing another shaper's row id changes nothing (T-02-03).
 * The name column is unbounded text and stored verbatim: no normalization, no case folding, no
 * length cap. A name is a label, not an identity — two of a shaper's boards may share one, and
 * the row id remains the identity.
 */
export async function renameModel(modelId: string, name: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Sign in to rename a board.");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Board needs a name.");

  // The rename must reach the snapshot's embedded boardName too, not just the name column —
  // reopening restores the name from the snapshot, and the next autosave writes that restored
  // name back to the column, so a column-only rename silently reverts on the first edit after
  // reopening. Same write-boundary invariant saveModel and duplicateModel hold: the column and
  // the embedded name never drift. The ownership-scoped read means a foreign row id reads
  // nothing and the action refuses (T-02-03), with duplicateModel's exact wording so the
  // message leaks nothing about whether the row exists.
  const [source] = await db.select({ snapshot: models.snapshot })
    .from(models)
    .where(and(eq(models.id, modelId), eq(models.clerkUserId, userId)));
  if (!source) throw new Error("Couldn't find that board.");

  const design = parseSnapshot(source.snapshot);
  const envelope = buildSnapshot({ ...design, boardName: trimmed });

  await db.update(models)
    .set({ name: trimmed, snapshot: envelope, updatedAt: new Date() })
    .where(and(eq(models.id, modelId), eq(models.clerkUserId, userId)));
  revalidatePath("/");
}

export interface DuplicateModelResult {
  id: string;
}

/**
 * Branches a copy of one of the shaper's own boards (D-09/D-13) — the deliberate way to riff on a
 * shape now that Save writes over the board that was opened. Reads the source row through an
 * ownership-scoped select, so a row id that is not this shaper's reads nothing and the action
 * refuses rather than copying someone else's board (T-02-12): the snapshot written into the new
 * row always comes from that read, never from anything the client passed in. The copy gets fresh
 * created/updated stamps, which is what floats it to the top of the last-touched-first rack; the
 * source row is left untouched.
 */
export async function duplicateModel(modelId: string): Promise<DuplicateModelResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Sign in to duplicate a board.");

  const [source] = await db.select({ name: models.name, snapshot: models.snapshot })
    .from(models)
    .where(and(eq(models.id, modelId), eq(models.clerkUserId, userId)));
  if (!source) throw new Error("Couldn't find that board.");

  // Validated on the way back in, same as a save (T-02-05) — a corrupt or stale source snapshot
  // is never written forward into a new row unchecked.
  const design = parseSnapshot(source.snapshot);
  const copyName = `Copy of ${source.name}`;
  const envelope = buildSnapshot({ ...design, boardName: copyName });

  const [row] = await db.insert(models)
    .values({ clerkUserId: userId, name: copyName, snapshot: envelope })
    .returning({ id: models.id });
  revalidatePath("/");
  return { id: row.id };
}

/**
 * Deletes one of the shaper's own boards (D-13). Constrained on both the row id and the owning-
 * user column, same as every other mutation here. There is no soft-delete column and no trash
 * table: D-13 decided the confirm dialog is the safety, so this really does remove the row
 * (T-02-13, accepted).
 */
export async function deleteModel(modelId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Sign in to delete a board.");

  await db.delete(models).where(and(eq(models.id, modelId), eq(models.clerkUserId, userId)));
  revalidatePath("/");
}
