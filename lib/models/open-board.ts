/**
 * The board a shaper is working on, kept in this browser (quick 261019-ep5).
 *
 * The board on screen used to live only in the page's memory, so every full page load — a reload,
 * a phone's Safari refreshing a tab it had put in the background, a bookmark, and every new deploy
 * of the site (an open tab reloads itself on its next screen change once the site has changed) —
 * opened the stock 6'0" board with no blank and the stock foil. The founder, 2026-10-19: "Somehow,
 * I keep ending up on a board without a blank and a pretty lame looking foil." This module keeps a
 * copy of the open board in the browser's own storage so the next load brings the same board back.
 *
 * What is kept: exactly what a save stores (`buildSnapshot` from `design-snapshot.ts` — nothing is
 * written out by hand), plus four things a save does not hold: which saved board in the rack this
 * is (`modelId`), whose account that saved board belongs to (`ownerId`), whether it is locked, and
 * whether it has changes the account has not received yet (`dirty`). What is NOT kept: the undo
 * history (it belongs to one visit, by design) and the Save button's Saving/Saved/Not saved status.
 *
 * Only a board somebody has started is ever written: an untouched board's foil tips follow the gear
 * menu's live Tip defaults (D-19), and a copy would freeze them. The store decides that; this module
 * only reads and writes.
 *
 * The reader never throws. Anything it cannot trust — a damaged copy, a copy written by a future
 * version of this module, a board the save reader itself refuses — reads as "no copy", and the
 * page opens the stock board exactly as it always did. A saved board is trusted only together with
 * the account it belongs to: a copy that names a saved board but no account comes back as an unsaved
 * board instead.
 *
 * The owner rule (`reconcileOpenBoardOwner`): a saved board that comes back after a reload keeps
 * saving to its own place in the rack for the same shaper — and an edit that had not saved yet is
 * saved once the sign-in service confirms that shaper. A different account signed in on the same
 * browser gets the board as an unsaved board instead. Signing out alone never loses the link. This
 * is safe either way, because the server only ever writes a saved board for the account that owns
 * it; the rule just stops the app from trying, and from showing a save that failed.
 *
 * Nothing here is ever sent anywhere: the copy lives in this browser only. Every browser call sits
 * inside try/catch, with a page-memory copy for a browser that refuses storage (the same fallback
 * `components/saved-blanks-provider.tsx` keeps), so the module also runs in a node test with no
 * `localStorage` at all.
 */

import { z } from "zod";
import { buildSnapshot, parseSnapshot, type DesignSnapshotFields, type ParseSnapshotOptions } from "./design-snapshot";

/** The one browser storage key the open board is kept under. */
export const OPEN_BOARD_STORAGE_KEY = "shaper-open-board";

/** The copy's own version — separate from a saved board's, so a later change to what the copy
 * carries can be read forgivingly (or ignored) without touching any saved board. */
export const OPEN_BOARD_COPY_VERSION = 1;

/** How long after the last change the copy is written. A slider drag changes the board many
 * times a second; only the last of them needs writing. The page also writes it at once as it goes
 * away or is hidden, so this wait never loses an edit. */
export const OPEN_BOARD_WRITE_DEBOUNCE_MS = 250;

/** The longest saved-board id or account id the reader accepts (anything longer is not ours). */
const MAX_ID_LENGTH = 200;

/** The four things kept beside the board that a save itself does not hold. */
export interface OpenBoardBookkeeping {
  /** The saved board in the rack this is, or null for a board never saved. */
  modelId: string | null;
  /** The account that saved board belongs to, or null when there is none (or it is not known). */
  ownerId: string | null;
  /** Whether that saved board is locked (the lock belongs to the saved board, so no row, no lock). */
  locked: boolean;
  /** Whether the board on screen has changes the account has not received yet. */
  dirty: boolean;
}

/** A copy read back: the board itself, and its bookkeeping. */
export interface OpenBoardCopy extends OpenBoardBookkeeping {
  snapshot: DesignSnapshotFields;
}

/** The saved-board link the owner rule looks at: which saved board, whose, and its lock. */
export interface OpenBoardRow {
  modelId: string | null;
  ownerId: string | null;
  locked: boolean;
}

const idSchema = z.string().max(MAX_ID_LENGTH).nullable();

/** The copy's outer shape. The board inside (`snapshot`) is checked by the save reader itself. */
const envelopeSchema = z.object({
  version: z.literal(OPEN_BOARD_COPY_VERSION),
  snapshot: z.unknown(),
  modelId: idSchema,
  ownerId: idSchema,
  locked: z.boolean(),
  dirty: z.boolean(),
});

/** The copy as text, ready to store: a save's own snapshot plus the bookkeeping. */
export function openBoardCopyJson(fields: DesignSnapshotFields, bookkeeping: OpenBoardBookkeeping): string {
  return JSON.stringify({
    version: OPEN_BOARD_COPY_VERSION,
    snapshot: buildSnapshot(fields),
    modelId: bookkeeping.modelId,
    ownerId: bookkeeping.ownerId,
    locked: bookkeeping.locked,
    dirty: bookkeeping.dirty,
  });
}

/**
 * Reads a stored copy back, or `null` for anything it cannot trust — never throws. The board is
 * read through `parseSnapshot`, the same reader a saved board takes when it is reopened, so an older
 * saved-board version comes back by that reader's own rules and an out-of-range board is refused.
 * A saved board is kept only with its account; without one the board comes back unsaved (and
 * unlocked, since the lock belongs to the saved board), its unsaved changes still marked.
 */
export function parseOpenBoardCopy(raw: string | null, options?: ParseSnapshotOptions): OpenBoardCopy | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const envelope = envelopeSchema.safeParse(value);
  if (!envelope.success) return null;
  let snapshot: DesignSnapshotFields;
  try {
    snapshot = parseSnapshot(envelope.data.snapshot, options);
  } catch {
    return null;
  }
  const { modelId, ownerId, locked, dirty } = envelope.data;
  const trusted = typeof modelId === "string" && modelId !== "" && typeof ownerId === "string" && ownerId !== "";
  return trusted
    ? { snapshot, modelId, ownerId, locked, dirty }
    : { snapshot, modelId: null, ownerId: null, locked: false, dirty };
}

/** Where the copy lives for the rest of this page's life when the browser refuses storage. */
let blockedStorageRaw: string | null = null;

/** The stored copy as text, or null — from page memory when the browser refuses storage. */
export function readOpenBoardCopy(): string | null {
  try {
    return localStorage.getItem(OPEN_BOARD_STORAGE_KEY);
  } catch {
    return blockedStorageRaw;
  }
}

/** Stores the copy. A write the browser refuses (storage full) also removes the older stored copy,
 * so a stale, older board can never come back after a later reload; the page keeps the board on
 * screen either way. */
export function writeOpenBoardCopy(json: string): void {
  blockedStorageRaw = json;
  try {
    localStorage.setItem(OPEN_BOARD_STORAGE_KEY, json);
  } catch {
    try {
      localStorage.removeItem(OPEN_BOARD_STORAGE_KEY);
    } catch {
      // Storage refused outright: the page-memory copy above keeps the board until a reload.
    }
  }
}

/** Forgets the kept board — a new board was started or a saved one opened on purpose. */
export function clearOpenBoardCopy(): void {
  blockedStorageRaw = null;
  try {
    localStorage.removeItem(OPEN_BOARD_STORAGE_KEY);
  } catch {
    // Storage refused: nothing stored to remove.
  }
}

/**
 * The owner rule: given the saved-board link a board carries and the account signed in right now
 * (`undefined` while the sign-in service is still loading, `null` signed out, an id signed in),
 * the link the board should carry from now on.
 *
 * - Not known yet, or signed out: kept exactly as it is. A sign-out alone never loses a saved
 *   board's link, so signing back in keeps saving to it.
 * - The same account: kept.
 * - A different account: the link and its lock are dropped, and the board stays open as an
 *   unsaved board — a second shaper on the same browser never saves into the first one's board.
 * - A saved board whose owner is not known yet, with someone signed in: that account becomes its
 *   owner (a board is only ever saved, or opened from the rack, while signed in).
 * - No saved board: no owner, whoever is signed in.
 *
 * Safe either way: the save on the server (`saveModel` in `app/design/actions.ts`) only ever writes
 * a saved board when both its id and the signed-in account match, so nothing can reach another
 * shaper's board whatever this says. This rule only stops the app from trying, and from showing a
 * save that failed.
 */
export function reconcileOpenBoardOwner(row: OpenBoardRow, userId: string | null | undefined): OpenBoardRow {
  if (row.modelId === null) return { modelId: null, ownerId: null, locked: row.locked };
  if (typeof userId !== "string") return row;
  if (row.ownerId === null) return { ...row, ownerId: userId };
  if (row.ownerId === userId) return row;
  return { modelId: null, ownerId: null, locked: false };
}

/** Writes a copy that is still waiting for its short wait, at once, and only once. */
export function flushOpenBoardCopy(pending: { current: string | null }): void {
  const json = pending.current;
  if (json === null) return;
  pending.current = null;
  writeOpenBoardCopy(json);
}
