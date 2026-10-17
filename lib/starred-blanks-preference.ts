/**
 * Starred blanks preference boundary (quick 261015-ve9, D-06 — the founder's decision of
 * 2026-10-15). A shaper stars the blanks they keep coming back to in ROCKER's PICK A BLANK popup,
 * and those blanks sit in a ★ STARRED group above the rest.
 *
 * A star is a blank's identity: its maker and its name, which are unique together in the catalogue.
 * The value is the list of `[maker, name]` pairs, in the order they were starred. A star naming a
 * blank no longer in the catalogue is simply never shown — nothing here needs to know the catalogue.
 *
 * Part 1 (quick 261015-ve9) kept the stars in this browser only, in localStorage. Part 2 (quick
 * 261016-usz, 2026-10-16, the founder's decision of 2026-10-15) puts them on the shaper's account:
 *
 * - Signed out, nothing changed from part 1 — this browser remembers the stars (D-02).
 * - Signed in, the account is where stars live (D-03). On a signed-in page load the account's list
 *   REPLACES this browser's copy, so a star removed on the phone stays removed on the computer; and
 *   every star and unstar is saved back to the account (D-04).
 * - Stars made while signed out are not lost: they JOIN the account at the next sign-in in this
 *   browser, after the account's own stars, and the joined list is saved (D-04).
 * - Which stars are waiting to join is kept as a second LIST under its own key, not a yes/no flag
 *   (P-1). A flag couldn't tell a star made while signed out from one that came down from another
 *   shaper's account, and would join that shaper's stars into whoever signs in next. A join only
 *   takes waiting stars still starred here (P-8).
 * - A browser that last ran part 1 has no waiting list at all. Every star it holds was made while
 *   signed out, so all of them join at its first signed-in load (P-2); from then on the list always
 *   exists, possibly empty.
 * - When the account can't be read (a database hiccup, or the column not there yet), that is its own
 *   state, `account-unreadable`, never "the account has no stars" (P-3). The browser's copy shows, a
 *   star made then waits to join like a signed-out one, and nothing is saved, replaced or cleared —
 *   so a failed read can never overwrite the account's real list with this browser's.
 *
 * There is no cookie (D-05): a long star list would outgrow one, and the stars only ever render in
 * the browser, inside the popup, so the server never needs them for a first paint.
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

/**
 * The stars made in this browser while signed out that have not yet joined an account, as
 * `[maker, name]` pairs in starring order (P-1, quick 261016-usz). Never written means a browser
 * from before stars were kept on the account (P-2).
 */
export const STARRED_BLANKS_TO_JOIN_STORAGE_KEY = "shaper-starred-blanks-to-join";

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

// ─── Part 2: stars on the shaper's account (quick 261016-usz, 2026-10-16) ─────────────────────────

/**
 * What the server hands the browser about the shaper's account stars (D-03, P-3). Plain data, so it
 * crosses from the server to the browser as it is.
 * - `signed-out`: no account; the browser's stars are all there is (D-02).
 * - `signed-in`: the account's list, read and cleaned on the server.
 * - `account-unreadable`: signed in, but the account's list couldn't be read. Never treated as "no
 *   stars", so nothing is replaced, saved or cleared until a later load reads it (P-3).
 */
export type StarredBlanksHandoff =
  | { kind: "signed-out" }
  | { kind: "signed-in"; account: StarredBlank[] }
  | { kind: "account-unreadable" };

/**
 * Reads a Server Action's input (D-06, P-6): anything that is not a list is refused (`null`, and the
 * caller writes nothing); a list keeps exactly what `parseStarredBlanks` keeps. So `[]` is a real
 * value — the shaper unstarred their last blank — and saves as no stars.
 */
export function parseStarredBlanksInput(value: unknown): StarredBlank[] | null {
  if (!Array.isArray(value)) return null;
  return parseStarredBlanks(value);
}

/**
 * The account's stars first, in their order, then each browser-only star not already on the account,
 * in its order (D-04). A star on both appears once, in the account's place; the result stops at
 * `STARRED_BLANKS_MAX`, so a join drops any overflow (P-8). Neither input is changed.
 */
export function joinStarredBlanks(
  account: readonly StarredBlank[],
  browserOnly: readonly StarredBlank[],
): StarredBlank[] {
  return parseStarredBlanks([...account, ...browserOnly]);
}

/** What a page load (or a sign-in or sign-out) does with the stars. Each write is `null` when there is nothing to write. */
export interface StarredBlanksDecision {
  /** The stars to show. */
  starred: StarredBlank[];
  /** Non-null when this browser's star list must be rewritten. */
  writeBrowser: StarredBlank[] | null;
  /** Non-null when the waiting-to-join list must be rewritten (always `[]` after a join). */
  writeToJoin: StarredBlank[] | null;
  /** Non-null when the account's list must be saved. */
  saveToAccount: StarredBlank[] | null;
}

/**
 * The hand-off between this browser's stars and the account's (D-04, P-1, P-2, P-3, P-8):
 * - Signed out, or the account unreadable: show this browser's stars and write nothing — stars
 *   waiting to join keep waiting.
 * - Signed in: the stars that join are the waiting ones (`toJoin`), or every star here when this
 *   browser has never kept a waiting list (`toJoin` null, a part-1 browser), and only those still
 *   starred here. They go after the account's own. The result replaces this browser's copy when it
 *   differs, is saved to the account when it differs from the account's, and the waiting list is
 *   emptied whenever it was missing or held anything. With nothing waiting, the account simply
 *   replaces this browser's copy — which is what keeps another shaper's synced stars out.
 */
export function decideStarredBlanksHandoff(input: {
  handoff: StarredBlanksHandoff;
  browser: readonly StarredBlank[];
  toJoin: readonly StarredBlank[] | null;
}): StarredBlanksDecision {
  const { handoff, browser, toJoin } = input;
  if (handoff.kind !== "signed-in") {
    return { starred: [...browser], writeBrowser: null, writeToJoin: null, saveToAccount: null };
  }

  const here = new Set(browser.map(([vendor, name]) => starKey(vendor, name)));
  const joining = (toJoin ?? browser).filter(([vendor, name]) => here.has(starKey(vendor, name)));
  const joined = joinStarredBlanks(handoff.account, joining);
  const joinedJson = starredBlanksJson(joined);

  return {
    starred: joined,
    writeBrowser: joinedJson !== starredBlanksJson(browser) ? joined : null,
    writeToJoin: toJoin === null || toJoin.length > 0 ? [] : null,
    saveToAccount: joinedJson !== starredBlanksJson(handoff.account) ? joined : null,
  };
}

/** One tap's result. `toJoin` and `save` are `null` when there is nothing to write. */
export interface StarChange {
  starred: StarredBlank[];
  toJoin: StarredBlank[] | null;
  save: StarredBlank[] | null;
}

/**
 * One star or unstar (D-03, P-1, P-2, P-5). `null` when the star list wouldn't change (already
 * starred, not starred, at the cap, or a maker or name the reader would refuse).
 * - In this browser only (`savesToAccount` false — signed out, or the account unreadable): a new star
 *   also joins the waiting list; unstarring takes it off both. Unstarring a star that came from an
 *   account changes this browser only and leaves the waiting list as it is, so the account's list
 *   brings it back at the next sign-in — never lost, and never unstarred from whoever signs in next
 *   (P-5). A browser with no waiting list yet (part 1) counts every star as waiting (P-2).
 * - On the account (`savesToAccount` true): the new list is saved; the waiting list is left alone,
 *   except that unstarring a blank still on it takes it off there too.
 */
export function applyStarChange(input: {
  savesToAccount: boolean;
  starred: readonly StarredBlank[];
  toJoin: readonly StarredBlank[] | null;
  vendor: string;
  name: string;
  on: boolean;
}): StarChange | null {
  const { savesToAccount, starred, toJoin, vendor, name, on } = input;
  const next = withStar(starred, vendor, name, on);
  if (next === starred) return null;
  const nextStarred = [...next];
  const key = starKey(vendor, name);
  const withoutThis = (list: readonly StarredBlank[]) => list.filter(([v, n]) => starKey(v, n) !== key);

  if (!savesToAccount) {
    if (toJoin === null) return { starred: nextStarred, toJoin: [...nextStarred], save: null };
    const nextToJoin = on ? [...withStar(toJoin, vendor, name, true)] : withoutThis(toJoin);
    return { starred: nextStarred, toJoin: nextToJoin, save: null };
  }

  const waiting = toJoin !== null && toJoin.some(([v, n]) => starKey(v, n) === key);
  return { starred: nextStarred, toJoin: !on && waiting ? withoutThis(toJoin) : null, save: nextStarred };
}
