/**
 * Starred blanks preference boundary (quick 261015-ve9, D-06 — the founder's decision of
 * 2026-10-15). A shaper stars the blanks they keep coming back to in ROCKER's PICK A BLANK popup,
 * and those blanks sit in a ★ STARRED group above the rest.
 *
 * A star is a blank's identity: its maker and its name, which are unique together in the catalogue.
 * The value is the list of `[maker, name]` pairs, in the order they were starred. A star naming a
 * blank no longer in the catalogue is simply never shown — nothing here needs to know the catalogue.
 *
 * Part 1 (this task) keeps the stars in this browser only, in localStorage. Part 2, a later task,
 * adds the account column's readers, the strict Server Action input reader and the sign-in hand-off
 * (a browser's stars JOIN the account's) beside these, without changing any export here. There is no
 * cookie: a long star list would outgrow one, and the stars only ever render in the browser, inside
 * the popup, so the server never needs them for a first paint.
 *
 * Every stored value is untrusted — any script or extension on the device can write localStorage.
 * The reader keeps only pairs of strings each 1 to `BLANK_TEXT_MAX` characters long (the catalogue's
 * own cap on a maker or a name), drops repeats, keeps at most `STARRED_BLANKS_MAX`, and never throws:
 * anything malformed reads as no stars. Stars render as React text and an `aria-label` only.
 *
 * No React, browser global or database import — as pure as its siblings.
 */

import { BLANK_TEXT_MAX } from "./blanks/catalog";

export const STARRED_BLANKS_STORAGE_KEY = "shaper-starred-blanks";

/** The most stars kept — far more than the catalogue's few hundred blanks a shaper would ever star. */
export const STARRED_BLANKS_MAX = 500;

/** One starred blank: `[maker, name]`. */
export type StarredBlank = readonly [vendor: string, name: string];

function isIdentityText(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= BLANK_TEXT_MAX;
}

/** A stable key for one blank's identity. A JSON pair, so no separator in a name can collide. */
export function starKey(vendor: string, name: string): string {
  return JSON.stringify([vendor, name]);
}

/**
 * Reads a stored star list back: `[maker, name]` string pairs only, each 1 to `BLANK_TEXT_MAX`
 * characters; repeats dropped (the first kept); at most `STARRED_BLANKS_MAX`. Anything that is not a
 * list reads as no stars. Never throws.
 */
export function parseStarredBlanks(value: unknown): StarredBlank[] {
  if (!Array.isArray(value)) return [];
  const out: StarredBlank[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (out.length >= STARRED_BLANKS_MAX) break;
    if (!Array.isArray(entry) || entry.length !== 2) continue;
    const [vendor, name] = entry as unknown[];
    if (!isIdentityText(vendor) || !isIdentityText(name)) continue;
    const key = starKey(vendor, name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([vendor, name]);
  }
  return out;
}

/** Reads the stored JSON text: no stars for nothing stored, malformed JSON or a non-list. Never throws. */
export function parseStarredBlanksText(text: string | null | undefined): StarredBlank[] {
  if (!text) return [];
  try {
    return parseStarredBlanks(JSON.parse(text));
  } catch {
    return [];
  }
}

/** The JSON text written to storage. */
export function starredBlanksJson(starred: readonly StarredBlank[]): string {
  return JSON.stringify(starred.map(([vendor, name]) => [vendor, name]));
}

/**
 * The star list after starring (`on: true`, added at the end) or unstarring one blank. Returns the
 * SAME list when nothing changes — already starred, not starred, at the cap, or a maker or name the
 * reader would refuse — so a caller can skip the write.
 */
export function withStar(
  starred: readonly StarredBlank[],
  vendor: string,
  name: string,
  on: boolean,
): readonly StarredBlank[] {
  const key = starKey(vendor, name);
  const index = starred.findIndex(([v, n]) => starKey(v, n) === key);
  if (on) {
    if (index !== -1) return starred;
    if (starred.length >= STARRED_BLANKS_MAX) return starred;
    if (!isIdentityText(vendor) || !isIdentityText(name)) return starred;
    return [...starred, [vendor, name]];
  }
  if (index === -1) return starred;
  return starred.filter((_, i) => i !== index);
}
