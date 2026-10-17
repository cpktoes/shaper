/**
 * Saved blanks boundary (quick 261016-mkb — the founder's decision of 2026-10-16, D-09). A shaper who
 * customises a blank's rocker saves it as a blank of their own: "it should not replace the natural
 * rocker blank, but essentially add a new blank to our catalogue". A saved blank is the base blank's
 * catalogue rows BY VALUE (exactly as a board keeps its blank, D-01) plus the rocker as ordered from
 * the maker, and it is starred the moment it is saved (plan 02). Every custom rocker in use is one.
 *
 * Signed in, the account's list is the list (`app/actions/user-blanks.ts`, the `user_blanks` table);
 * signed out, this browser keeps it in localStorage under `SAVED_BLANKS_STORAGE_KEY`. Joining a
 * browser's list into the account at sign-in is not built yet — it ships with the stars' own join
 * (quick 261015-ve9 part 2).
 *
 * Every stored or sent value is untrusted — any script or extension on the device can write
 * localStorage, and a Server Action's input arrives over the wire. So a blank's copy is read through
 * the board snapshot's own bounded `blankRecordSchema` (shape and `isPickable`), its rocker through
 * rule 8's strict `blankRockerSpecSchema` and then `normalizeSpec`, and a natural rocker is refused —
 * a saved blank always carries a custom one. The list reader keeps only entries that pass, drops
 * repeats by identity, keeps at most `SAVED_BLANKS_MAX`, and never throws. Saved blanks render as
 * React text only (plans 02 and 03).
 *
 * No React, browser global or database import — as pure as its siblings.
 */

import type { BlankRecord } from "./geometry/blank";
import { blankStarIdentity, isNaturalSpec, normalizeSpec, type BlankRockerSpec } from "./geometry/custom-rocker";
import { blankRecordSchema, blankRockerSpecSchema } from "./models/design-snapshot";
import { starKey } from "./starred-blanks-preference";

export const SAVED_BLANKS_STORAGE_KEY = "shaper-saved-blanks";

/**
 * The most saved blanks kept — per account, and in a browser (P-5). Measured at plan time
 * (2026-10-16): the largest saved blank, the biggest catalogue copy with four changes, is 2,636 bytes
 * of JSON, so 100 is about 257 KB — about 5% of a browser's ~5 MB of local storage.
 */
export const SAVED_BLANKS_MAX = 100;

/** What a shaper reads when a save would make a 101st saved blank (P-5). */
export const SAVED_BLANKS_FULL_MESSAGE = `You have ${SAVED_BLANKS_MAX} saved blanks — remove one in Pick a Blank to save another.`;

/** The longest id the browser list keeps (an account row's id is a 36-character uuid). */
const SAVED_BLANK_ID_MAX = 64;

/** One saved blank: its id, the base blank's catalogue rows by value, and the rocker as ordered. */
export interface SavedBlank {
  id: string;
  copy: BlankRecord;
  rocker: BlankRockerSpec;
}

/** What `listSavedBlanks` answers: signed out, or the account's list (empty and `unavailable` when
 * the database could not be read — the ROCKER page streams it and must never fail on it). */
export type SavedBlanksAccount =
  | { signedIn: false }
  | { signedIn: true; blanks: SavedBlank[]; unavailable?: true };

/** What a save or an update answers. `missing`: no row of the shaper's has that id any more (the
 * caller then saves a new one, D-09). `full`: the account already holds `SAVED_BLANKS_MAX`. */
export type SaveUserBlankResult =
  | { ok: true; blank: SavedBlank }
  | { ok: false; reason: "signed-out" | "invalid" | "full" | "missing"; message?: string };

/** What a remove answers. */
export type RemoveUserBlankResult = { ok: true } | { ok: false; reason: "signed-out" | "invalid" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIdText(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= SAVED_BLANK_ID_MAX;
}

/**
 * Reads a saved blank's two parts — `{ copy, rocker }` — strictly: the copy through the snapshot's
 * `blankRecordSchema` (bounded, stations tail to nose, pickable), the rocker through rule 8's
 * `blankRockerSpecSchema` and then `normalizeSpec` at the copy's own length. Null for anything that
 * is not an object, a copy or rocker that fails, or a rocker that changes nothing.
 */
export function parseSavedBlankInput(value: unknown): { copy: BlankRecord; rocker: BlankRockerSpec } | null {
  if (!isRecord(value)) return null;
  const copy = blankRecordSchema.safeParse(value.copy);
  if (!copy.success) return null;
  const rocker = blankRockerSpecSchema.safeParse(value.rocker);
  if (!rocker.success) return null;
  // The same deliberate brand bridge as the snapshot's rule 1: every field was just validated.
  const record = copy.data as BlankRecord;
  const spec = normalizeSpec(rocker.data as BlankRockerSpec, record.lengthMm);
  if (isNaturalSpec(spec)) return null;
  return { copy: record, rocker: spec };
}

/** A database row read back as a saved blank, or null when its copy or rocker no longer reads. */
export function savedBlankFromRow(row: { id: unknown; copy: unknown; rocker: unknown }): SavedBlank | null {
  if (!isIdText(row.id)) return null;
  const parsed = parseSavedBlankInput({ copy: row.copy, rocker: row.rocker });
  return parsed ? { id: row.id, ...parsed } : null;
}

/** A saved blank's identity — its star key: maker plus its one-line name, note included (D-02). */
export function savedBlankIdentity(entry: { copy: BlankRecord; rocker: BlankRockerSpec }): string {
  return starKey(...blankStarIdentity(entry.copy, entry.rocker));
}

/**
 * Reads a stored list back: entries with an id of 1 to 64 characters whose copy and rocker pass
 * `parseSavedBlankInput`; repeats by identity dropped (the first kept); at most `SAVED_BLANKS_MAX`.
 * Anything that is not a list reads as no saved blanks. Never throws.
 */
export function parseSavedBlanks(value: unknown): SavedBlank[] {
  if (!Array.isArray(value)) return [];
  const out: SavedBlank[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (out.length >= SAVED_BLANKS_MAX) break;
    if (!isRecord(entry) || !isIdText(entry.id)) continue;
    const parsed = parseSavedBlankInput(entry);
    if (!parsed) continue;
    const key = savedBlankIdentity(parsed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: entry.id, ...parsed });
  }
  return out;
}

/** Reads the stored JSON text: no saved blanks for nothing stored, malformed JSON or a non-list. Never throws. */
export function parseSavedBlanksText(text: string | null | undefined): SavedBlank[] {
  if (!text) return [];
  try {
    return parseSavedBlanks(JSON.parse(text));
  } catch {
    return [];
  }
}

/** The JSON text written to storage. */
export function savedBlanksJson(list: readonly SavedBlank[]): string {
  return JSON.stringify(list.map(({ id, copy, rocker }) => ({ id, copy, rocker })));
}

/**
 * The list with `entry` added at the end. Returns the SAME list when the blank is already saved (its
 * identity is) or the list is full, so a caller can tell a refusal and show `SAVED_BLANKS_FULL_MESSAGE`.
 */
export function withSavedBlank(list: readonly SavedBlank[], entry: SavedBlank): readonly SavedBlank[] {
  if (list.length >= SAVED_BLANKS_MAX) return list;
  const key = savedBlankIdentity(entry);
  if (list.some((saved) => savedBlankIdentity(saved) === key)) return list;
  return [...list, entry];
}

/** The list without the saved blank `id`. The SAME list when there is none. */
export function withoutSavedBlank(list: readonly SavedBlank[], id: string): readonly SavedBlank[] {
  if (!list.some((saved) => saved.id === id)) return list;
  return list.filter((saved) => saved.id !== id);
}

/** The list with the saved blank `id` edited in place — the same id, the same position. The SAME
 * list when there is none. */
export function withReplacedSavedBlank(
  list: readonly SavedBlank[],
  id: string,
  copy: BlankRecord,
  rocker: BlankRockerSpec,
): readonly SavedBlank[] {
  const index = list.findIndex((saved) => saved.id === id);
  if (index === -1) return list;
  return list.map((saved, i) => (i === index ? { id, copy, rocker } : saved));
}
