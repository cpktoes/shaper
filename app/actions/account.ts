"use server";

/**
 * Server Actions behind the Your data page in Clerk's account panel (quick 261006-g4u, 2026-10-06):
 * the two things the Privacy Policy promises a signed-in shaper, section 6. Copies
 * `app/actions/rack-order.ts`'s shape: `await auth()` runs before any database statement, and no
 * parameter ever accepts a user id, owner id or Clerk id from the browser — who is asking always
 * comes from the sign-in session. Mechanically enforced by `lib/db/ownership.test.ts` (D-07).
 *
 * Quick 261103-k8o (2026-11-03, R1b, R3) adds Import my designs, which takes the boards of an Export
 * my designs file back: `listMyBoardIds` answers the shaper's own board ids, so the page can say
 * before anything is written what will be added and what is already there, and `importMyDesigns`
 * then adds the boards a few at a time. It only ever ADDS: never an update and never a delete, every
 * board unlocked, a board already on the account left exactly as it is, and the file's settings
 * never read. Pinned by lib/db/ownership.test.ts's "Import my designs only adds" cases.
 *
 * Nothing here logs a caught error: a Drizzle or Clerk error message can carry the account id
 * (the same rule lib/clerk-webhook.ts follows).
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { deleteAccountData } from "@/lib/db/account-deletion";
import { models, userPreferences } from "@/lib/db/schema";
import { resolveCarryOverTipStyle } from "@/lib/fit-defaults-server";
import {
  buildDesignsExport,
  isDeleteConfirmed,
  type DeleteMyAccountResult,
  type ExportMyDesignsResult,
} from "@/lib/account/account-data";
import {
  boardLabel,
  orderWithImportedBoardsFirst,
  parseImportRequest,
  planImport,
  readImportEntries,
  type ImportMyDesignsResult,
  type ListMyBoardIdsResult,
} from "@/lib/account/import-designs";
import { buildSnapshot, hasPhase11Blank } from "@/lib/models/design-snapshot";
import {
  parseRackOrderColumn,
  rackOrderColumnValue,
  type SavedRackEntry,
} from "@/lib/models/rack-order";

// ---------------------------------------------------------------------------------------------
// Where imported boards stand in the rack (PC17). Module-private, the shape app/design/actions.ts
// keeps: each takes the owner only from an exported action below that has already awaited
// `auth()`, and every statement is scoped to that owner. Never exported — an export of a
// "use server" file is a callable action.
// ---------------------------------------------------------------------------------------------

/** The order the shaper set on their rack, or `null` when they never arranged it. */
async function readStoredRackOrder(clerkId: string): Promise<string[] | null> {
  const [row] = await db.select({ rackOrder: userPreferences.rackOrder })
    .from(userPreferences)
    .where(eq(userPreferences.clerkUserId, clerkId));
  return parseRackOrderColumn(row?.rackOrder ?? null);
}

/** The shaper's saved boards as the rack's automatic order reads them. */
async function listRackEntries(clerkId: string): Promise<SavedRackEntry[]> {
  const rows = await db.select({ id: models.id, name: models.name, updatedAt: models.updatedAt })
    .from(models)
    .where(eq(models.clerkUserId, clerkId));
  return rows.map((row) => ({ kind: "saved", id: row.id, name: row.name, updatedAt: row.updatedAt }));
}

/** Writes the whole rack order onto the shaper's own account row. */
async function storeRackOrder(clerkId: string, ids: readonly string[]): Promise<void> {
  const value = rackOrderColumnValue(ids);
  await db.insert(userPreferences)
    .values({ clerkUserId: clerkId, rackOrder: value })
    .onConflictDoUpdate({
      target: userPreferences.clerkUserId,
      set: { rackOrder: value, updatedAt: new Date() },
    });
}

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
 * Import my designs' preview (PC13): the signed-in shaper's own board ids and nothing else, so the
 * page can say which of a file's boards are already on the account before anything is written. Read
 * only — one select — so looking can never write. Signed out, nothing is read.
 */
export async function listMyBoardIds(): Promise<ListMyBoardIdsResult> {
  const { userId } = await auth();
  if (!userId) return { signedIn: false };

  const rows = await db.select({ id: models.id })
    .from(models)
    .where(eq(models.clerkUserId, userId));
  return { signedIn: true, ids: rows.map((row) => row.id) };
}

/**
 * Import my designs (R1b, R3, PC21): one call's boards, at most 25, from a file the page has read.
 *
 * 1. Who is asking comes from the sign-in session alone. Signed out, nothing happens.
 * 2. A request that is not a list of 1 to 25 boards with a real yes-or-no for copies is refused
 *    before any statement.
 * 3. Every board is read again here by the page's own rule (the save reader plus the rack's
 *    drawing check); a board that fails is named and never written. The shaper's Tip Style is
 *    looked up only when a board still carries a blank from before Phase 12, as Duplicate does.
 * 4. The account's own ids are read and `planImport` decides, exactly as the preview did: a board
 *    already on the account is left exactly as it is, a locked one included.
 * 5. Each board is ONE insert of its own, unlocked, so one bad board never rolls back another. A new
 *    board keeps its file id when that id is free (PC15); on a clash — another account's board,
 *    never touched — it goes in again with a fresh id. A copy always takes a fresh id. Never an
 *    update, never a delete.
 * 6. In a rack the shaper has arranged, everything added stands at the front (PC17); a failed
 *    placement never fails the import. Both dates are the database's own, now (PC14).
 */
export async function importMyDesigns(boards: unknown, includeCopies: unknown): Promise<ImportMyDesignsResult> {
  const { userId } = await auth();
  if (!userId) return { imported: false, reason: "signed-out" };

  const request = parseImportRequest(boards, includeCopies);
  if (request === null) return { imported: false, reason: "invalid" };

  const needsTipStyle = request.entries.some((entry) => hasPhase11Blank(entry.design));
  const read = readImportEntries(request.entries, {
    tipStyle: needsTipStyle ? await resolveCarryOverTipStyle() : undefined,
  });
  const failed = [...read.failed];

  const accountRows = await db.select({ id: models.id })
    .from(models)
    .where(eq(models.clerkUserId, userId));
  const plan = planImport(read.boards, new Set(accountRows.map((row) => row.id)), request.includeCopies);

  const addedIds: string[] = [];
  let added = 0;
  let copies = 0;
  for (const write of plan.writes) {
    const snapshot = buildSnapshot({ ...write.board.fields, boardName: write.name });
    try {
      let id: string | undefined;
      if (write.kind === "new" && write.keepId !== null) {
        const [kept] = await db.insert(models)
          .values({ id: write.keepId, clerkUserId: userId, name: write.name, snapshot, locked: false })
          .onConflictDoNothing({ target: models.id })
          .returning({ id: models.id });
        id = kept?.id;
      }
      if (id === undefined) {
        const [fresh] = await db.insert(models)
          .values({ clerkUserId: userId, name: write.name, snapshot, locked: false })
          .returning({ id: models.id });
        id = fresh.id;
      }
      addedIds.push(id);
      if (write.kind === "copy") copies += 1;
      else added += 1;
    } catch {
      // Not logged: the error can carry the account id.
      failed.push(boardLabel(write.board.name, write.board.position));
    }
  }

  if (addedIds.length > 0) {
    try {
      const stored = await readStoredRackOrder(userId);
      if (stored !== null) {
        await storeRackOrder(userId, orderWithImportedBoardsFirst(await listRackEntries(userId), stored, addedIds));
      }
    } catch {
      // Logged without the error, which can carry the account id; the boards are already in.
      console.error("Shaper: couldn't place imported boards first in the rack");
    }
    revalidatePath("/");
  }

  return { imported: true, added, alreadyThere: plan.alreadyThere.length, copies, failed };
}

/**
 * Delete my account (D-03), in this order, and never another:
 *
 * 1. Who is asking comes from the sign-in session alone. Signed out, nothing happens.
 * 2. The typed word is checked again here, so a request that skipped the page's confirmation
 *    removes nothing (`not-confirmed`).
 * 3. The shaper's saved boards, settings and saved blanks (quick 261016-mkb) leave the database in
 *    ONE all-or-nothing batch (`deleteAccountData`, the same delete Clerk's user.deleted message
 *    runs). If it fails it
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
