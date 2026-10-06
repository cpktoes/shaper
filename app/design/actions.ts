"use server";

/**
 * Server Actions for saving a board (MODL-01). Every action here re-derives the caller's
 * identity from `await auth()` before touching the database and never accepts a client-supplied
 * owner field (RESEARCH.md Pattern 2, Pitfall 3) — lib/db/ownership.test.ts holds both of those
 * properties mechanically.
 *
 * Phase 15 (the Board Rack): a brand-new board stands first in a rack the shaper has arranged
 * (D-01), and a copy stands right after its original — which fixes the rack's order, even in a rack
 * never arranged (D-02, D-16). Renaming and every autosave never move a board (D-03), and deleting
 * one writes nothing to the order: the rack simply skips an id that has no board.
 */

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { models, userPreferences } from "@/lib/db/schema";
import { resolveCarryOverTipStyle } from "@/lib/fit-defaults-server";
import {
  buildSnapshot,
  hasPhase11Blank,
  parseSnapshot,
  type DesignSnapshotFields,
} from "@/lib/models/design-snapshot";
import {
  orderAfterDuplicate,
  orderWithNewBoardFirst,
  parseRackOrderColumn,
  rackOrderColumnValue,
  type SavedRackEntry,
} from "@/lib/models/rack-order";

// ---------------------------------------------------------------------------------------------
// Phase 15 — where a new board or a copy stands in the rack. Module-private: each takes the owner
// only from an exported action below that has already awaited `auth()`, and every statement is
// scoped to that owner (T-15-21).
// ---------------------------------------------------------------------------------------------

/** The order the shaper set on their rack (D-03), or `null` when they never arranged it. */
async function readStoredRackOrder(clerkId: string): Promise<string[] | null> {
  const [row] = await db.select({ rackOrder: userPreferences.rackOrder })
    .from(userPreferences)
    .where(eq(userPreferences.clerkUserId, clerkId));
  return parseRackOrderColumn(row?.rackOrder ?? null);
}

/** The shaper's saved boards as the rack's automatic order reads them — newest first, by the
 * three fields that order needs (D-01, D-16). */
async function listRackEntries(clerkId: string): Promise<SavedRackEntry[]> {
  const rows = await db.select({ id: models.id, name: models.name, updatedAt: models.updatedAt })
    .from(models)
    .where(eq(models.clerkUserId, clerkId));
  return rows.map((row) => ({ kind: "saved", id: row.id, name: row.name, updatedAt: row.updatedAt }));
}

/** Writes the whole rack order onto the shaper's own account row (D-01, D-16). */
async function storeRackOrder(clerkId: string, ids: readonly string[]): Promise<void> {
  const value = rackOrderColumnValue(ids);
  await db.insert(userPreferences)
    .values({ clerkUserId: clerkId, rackOrder: value })
    .onConflictDoUpdate({
      target: userPreferences.clerkUserId,
      set: { rackOrder: value, updatedAt: new Date() },
    });
}

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
  //
  // A browser tab left open across the Phase 12 update still sends a blank with no cut of its own;
  // that is carried over here by its SHAPE (Pitfall 5 — the envelope below always says the current
  // version) with the shaper's own Tip Style (D-14). The Tip Style is looked up only for such a
  // blank, so an ordinary save costs no extra read, and the lookup never throws.
  const incoming = buildSnapshot(snapshot as DesignSnapshotFields);
  const design = parseSnapshot(incoming, {
    tipStyle: hasPhase11Blank(incoming) ? await resolveCarryOverTipStyle() : undefined,
  });

  // What the row stores is the envelope, not the bare fields: the read path
  // (the rack parsing each row, in app/page.tsx) requires `version` to be present, and the
  // version number is what lets Phase 4 grow the format without migrating existing rows.
  // The snapshot's embedded boardName is pinned to the row's name column here at the write
  // boundary — `name` is the authoritative label, and a reopened board restores its name from
  // the snapshot, so letting the two drift would hand the shaper back a nameless board.
  const envelope = buildSnapshot({ ...design, boardName: trimmed });

  if (modelId === null) {
    const [row] = await db.insert(models)
      .values({ clerkUserId: userId, name: trimmed, snapshot: envelope })
      .returning({ id: models.id });

    // D-01: in a rack the shaper has arranged, the new board stands first — right where the unsaved
    // board stood. With no stored order nothing is written: the automatic order already puts the
    // newest board first. A failed placement is logged and never fails the save.
    try {
      const stored = await readStoredRackOrder(userId);
      if (stored !== null) {
        await storeRackOrder(userId, orderWithNewBoardFirst(await listRackEntries(userId), stored, row.id));
      }
    } catch (error) {
      console.error("Shaper: couldn't place the new board first in the rack", error);
    }

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

  // A board still stored with a Phase 11 blank is carried over by its shape with the shaper's own
  // Tip Style (D-14, Pitfall 5), exactly as the rack reads it — and re-stored with the same five
  // station thicknesses.
  const design = parseSnapshot(source.snapshot, {
    tipStyle: hasPhase11Blank(source.snapshot) ? await resolveCarryOverTipStyle() : undefined,
  });
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
 * row always comes from that read, never from anything the client passed in. The source row is
 * left untouched.
 *
 * The copy no longer floats to the top of the rack: it stands right after its original, and that
 * fixes the rack's order — even in a rack the shaper never arranged — so the copy stays beside its
 * original from then on (Phase 15 D-02, D-16).
 */
export async function duplicateModel(modelId: string): Promise<DuplicateModelResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Sign in to duplicate a board.");

  const [source] = await db.select({ name: models.name, snapshot: models.snapshot })
    .from(models)
    .where(and(eq(models.id, modelId), eq(models.clerkUserId, userId)));
  if (!source) throw new Error("Couldn't find that board.");

  // Validated on the way back in, same as a save (T-02-05) — a corrupt or stale source snapshot
  // is never written forward into a new row unchecked. A Phase 11 blank is carried over by its
  // shape with the shaper's own Tip Style (D-14, Pitfall 5), exactly as the rack reads it.
  const design = parseSnapshot(source.snapshot, {
    tipStyle: hasPhase11Blank(source.snapshot) ? await resolveCarryOverTipStyle() : undefined,
  });
  const copyName = `Copy of ${source.name}`;
  const envelope = buildSnapshot({ ...design, boardName: copyName });

  const [row] = await db.insert(models)
    .values({ clerkUserId: userId, name: copyName, snapshot: envelope })
    .returning({ id: models.id });

  // D-02 / D-16: the copy stands right after its original, and the whole rack order is stored. A
  // failed placement is logged and never fails the duplicate — the copy simply stands first, where
  // the rack puts any board it has no place for.
  try {
    await storeRackOrder(
      userId,
      orderAfterDuplicate(await listRackEntries(userId), await readStoredRackOrder(userId), modelId, row.id),
    );
  } catch (error) {
    console.error("Shaper: couldn't place the copy beside its original in the rack", error);
  }

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
