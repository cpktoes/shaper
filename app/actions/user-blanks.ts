"use server";

/**
 * Server Actions for a shaper's saved blanks on their account (quick 261016-mkb, D-09, 2026-10-16):
 * a catalogue blank with its rocker as ordered from the maker, saved as a blank of the shaper's own —
 * "it should not replace the natural rocker blank, but essentially add a new blank to our catalogue"
 * (the founder). Copies `app/actions/fit-defaults.ts`'s shape: `await auth()` runs before any
 * database statement, and no parameter ever accepts a user id, owner id or Clerk id from the client —
 * the owner always comes from the session, and every statement is scoped by `clerk_user_id`.
 * Mechanically enforced by `lib/db/ownership.test.ts`.
 *
 * Every input arrives over the wire, so it is read strictly before anything is written
 * (`parseSavedBlankInput`: the blank's copy through the snapshot's bounded `blankRecordSchema`, its
 * rocker through rule 8's schema and `normalizeSpec`), and a row id must be a uuid. Every row read
 * back goes through `savedBlankFromRow`, so a row that no longer reads is dropped, never shown.
 *
 * A signed-out caller is not an error: a signed-out shaper's saved blanks live in the browser
 * (`lib/saved-blanks-preference.ts`), so each action answers `signed-out` instead of throwing.
 */

import { auth } from "@clerk/nextjs/server";
import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { userBlanks } from "@/lib/db/schema";
import {
  SAVED_BLANKS_FULL_MESSAGE,
  SAVED_BLANKS_MAX,
  parseSavedBlankInput,
  savedBlankFromRow,
  type RemoveUserBlankResult,
  type SaveUserBlankResult,
  type SavedBlank,
  type SavedBlanksAccount,
} from "@/lib/saved-blanks-preference";

/** A saved blank's row id: always a uuid (the table's own default). */
const rowIdSchema = z.uuid();

/**
 * The shaper's saved blanks, oldest first, at most `SAVED_BLANKS_MAX`. Signed out → `{ signedIn:
 * false }`. A row whose copy or rocker no longer reads is dropped. Never rejects: when the database
 * cannot be read it answers an empty, `unavailable` list, because the ROCKER page streams this beside
 * the catalogue (plan 02) and must never fail on it.
 */
export async function listSavedBlanks(): Promise<SavedBlanksAccount> {
  const { userId } = await auth();
  if (!userId) return { signedIn: false };
  try {
    const rows = await db.select({ id: userBlanks.id, copy: userBlanks.copy, rocker: userBlanks.rocker })
      .from(userBlanks)
      .where(eq(userBlanks.clerkUserId, userId))
      .orderBy(asc(userBlanks.createdAt))
      .limit(SAVED_BLANKS_MAX);
    const blanks = rows.map(savedBlankFromRow).filter((blank): blank is SavedBlank => blank !== null);
    return { signedIn: true, blanks };
  } catch {
    return { signedIn: true, blanks: [], unavailable: true };
  }
}

/**
 * Saves a new blank of the shaper's own. Refuses an input that does not read (`invalid`) before any
 * statement, and refuses a save when the account already holds `SAVED_BLANKS_MAX` (`full`, with the
 * sentence the shaper reads — P-5). Two saves racing past the count can at worst add one or two
 * more, which is harmless.
 */
export async function saveUserBlank(input: unknown): Promise<SaveUserBlankResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, reason: "signed-out" };
  const parsed = parseSavedBlankInput(input);
  if (!parsed) return { ok: false, reason: "invalid" };

  const [held] = await db.select({ n: count() }).from(userBlanks).where(eq(userBlanks.clerkUserId, userId));
  if (Number(held?.n ?? 0) >= SAVED_BLANKS_MAX) {
    return { ok: false, reason: "full", message: SAVED_BLANKS_FULL_MESSAGE };
  }

  const [row] = await db.insert(userBlanks)
    .values({ clerkUserId: userId, copy: parsed.copy, rocker: parsed.rocker })
    .returning({ id: userBlanks.id });
  return { ok: true, blank: { id: row.id, ...parsed } };
}

/**
 * Edits one of the shaper's saved blanks in place — "Use and edit current blank" (plan 02). The row
 * must be the shaper's own: the update is constrained on BOTH its id and the session's owner. No such
 * row (removed elsewhere, or never theirs) answers `missing`, and the caller saves a new one instead.
 */
export async function updateUserBlank(id: unknown, input: unknown): Promise<SaveUserBlankResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, reason: "signed-out" };
  const rowId = rowIdSchema.safeParse(id);
  if (!rowId.success) return { ok: false, reason: "invalid" };
  const parsed = parseSavedBlankInput(input);
  if (!parsed) return { ok: false, reason: "invalid" };

  const rows = await db.update(userBlanks)
    .set({ copy: parsed.copy, rocker: parsed.rocker, updatedAt: new Date() })
    .where(and(eq(userBlanks.id, rowId.data), eq(userBlanks.clerkUserId, userId)))
    .returning({ id: userBlanks.id });
  if (rows.length === 0) return { ok: false, reason: "missing" };
  return { ok: true, blank: { id: rows[0].id, ...parsed } };
}

/** Removes one of the shaper's saved blanks — constrained on both its id and the session's owner, so
 * a shaper can only ever remove their own. Removing one that is already gone is harmless. */
export async function removeUserBlank(id: unknown): Promise<RemoveUserBlankResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, reason: "signed-out" };
  const rowId = rowIdSchema.safeParse(id);
  if (!rowId.success) return { ok: false, reason: "invalid" };

  await db.delete(userBlanks).where(and(eq(userBlanks.id, rowId.data), eq(userBlanks.clerkUserId, userId)));
  return { ok: true };
}
