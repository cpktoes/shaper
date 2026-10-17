"use client";

/**
 * Holds the blanks a shaper has saved with a custom rocker (quick 261016-mkb, D-09 — the founder's
 * decision of 2026-10-16: "it should not replace the natural rocker blank, but essentially add a new
 * blank to our catalogue"), and is the one hook the Customize Rocker popup saves them through. Built
 * on `components/starred-blanks-provider.tsx`'s pattern.
 *
 * Like stars, saved blanks describe the shaper's own foam, not the board: they live outside the
 * design store and outside a saved board's own data, so saving a blank never changes a board on its
 * own — the popup sets the board's rocker itself, AFTER a save succeeds.
 *
 * Signed in, the account's list is the list (`app/actions/user-blanks.ts`, streamed by the ROCKER
 * page beside the catalogue and held here in state once it arrives). Signed out, this browser keeps
 * the list in localStorage under `SAVED_BLANKS_STORAGE_KEY`. Joining a browser's list into the
 * account at sign-in is not built yet — it ships with the stars' own join (quick 261015-ve9 part 2).
 *
 * The browser list is read exactly as the stars are: the snapshot is the RAW stored string (a
 * primitive, equal to itself while storage is unchanged), parsed once per change in a `useMemo`
 * through `lib/saved-blanks-preference.ts`'s untrusted-value allow-list reader. A save that finds an
 * identical saved blank (same maker, name and note) reuses it and writes nothing (P-15).
 */

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { removeUserBlank, saveUserBlank, updateUserBlank } from "@/app/actions/user-blanks";
import type { BlankRecord } from "@/lib/geometry/blank";
import type { BlankRockerSpec } from "@/lib/geometry/custom-rocker";
import {
  parseSavedBlanksText,
  SAVED_BLANKS_FULL_MESSAGE,
  SAVED_BLANKS_STORAGE_KEY,
  savedBlankIdentity,
  savedBlanksJson,
  withReplacedSavedBlank,
  withSavedBlank,
  withoutSavedBlank,
  type SaveUserBlankResult,
  type SavedBlank,
  type SavedBlanksAccount,
} from "@/lib/saved-blanks-preference";

/* -- the browser's list, as an external store ------------------------------------------ */

/** Subscribers for same-tab writes. The `storage` event only fires in *other* tabs. */
const storeListeners = new Set<() => void>();

/** Where the list lives for the rest of this page's life when the browser refuses storage. */
let blockedStorageRaw: string | null = null;

const SERVER_RAW = "[]";

function emitChange() {
  for (const listener of storeListeners) listener();
}

function subscribe(onStoreChange: () => void) {
  storeListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    storeListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getStoredRaw(): string | null {
  try {
    return localStorage.getItem(SAVED_BLANKS_STORAGE_KEY);
  } catch {
    return blockedStorageRaw;
  }
}

function getSnapshot(): string {
  return getStoredRaw() ?? SERVER_RAW;
}

function getServerSnapshot(): string {
  return SERVER_RAW;
}

function writeToBrowser(next: readonly SavedBlank[]) {
  const raw = savedBlanksJson(next);
  blockedStorageRaw = raw;
  try {
    localStorage.setItem(SAVED_BLANKS_STORAGE_KEY, raw);
  } catch {
    // Blocked storage: the page-memory copy above keeps the list until a reload.
  }
}

/** A fresh id for a browser-kept saved blank. */
function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* -------------------------------------------------------------------------------------- */

/** What a save, an update or a removal answers: the saved blank (and whether it is new), or the
 * sentence the shaper reads. */
export type SavedBlankWrite = { ok: true; blank: SavedBlank; created: boolean } | { ok: false; message: string };

const SIGNED_OUT_MESSAGE = "Sign in again to save blanks to your account.";
const CONNECTION_MESSAGE = "Couldn't save the blank — check your connection and try again.";

/** An account refusal, in words. */
function refusalMessage(result: Extract<SaveUserBlankResult, { ok: false }>): string {
  if (result.reason === "full") return SAVED_BLANKS_FULL_MESSAGE;
  if (result.reason === "signed-out") return SIGNED_OUT_MESSAGE;
  return CONNECTION_MESSAGE;
}

export interface SavedBlanksContextValue {
  /** Whether the list is the account's (signed in) or this browser's. */
  signedIn: boolean;
  /** The shaper's saved blanks, oldest first. */
  blanks: readonly SavedBlank[];
  /** The saved blank with this copy and rocker (matched by maker, name and note), or null. */
  findSaved: (copy: BlankRecord, rocker: BlankRockerSpec | undefined) => SavedBlank | null;
  /** Saves a new blank — or reuses an identical one already saved (`created: false`, P-15). */
  saveBlank: (copy: BlankRecord, rocker: BlankRockerSpec) => Promise<SavedBlankWrite>;
  /** Edits one saved blank in place; when it is gone, saves a new one instead (D-09). */
  updateBlank: (id: string, copy: BlankRecord, rocker: BlankRockerSpec) => Promise<SavedBlankWrite>;
  /** Removes one saved blank. */
  removeBlank: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
}

const SavedBlanksContext = createContext<SavedBlanksContextValue | null>(null);

export function SavedBlanksProvider({ account, children }: { account: SavedBlanksAccount; children: ReactNode }) {
  const signedIn = account.signedIn;
  // The browser's list — read always (the rules of hooks), used only while signed out.
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const browserBlanks = useMemo(() => parseSavedBlanksText(raw), [raw]);
  // The account's list, as the page streamed it, then kept here as the shaper saves.
  const [accountBlanks, setAccountBlanks] = useState<readonly SavedBlank[]>(account.signedIn ? account.blanks : []);
  const blanks = signedIn ? accountBlanks : browserBlanks;

  const findSaved = useCallback(
    (copy: BlankRecord, rocker: BlankRockerSpec | undefined) => {
      if (!rocker) return null;
      const key = savedBlankIdentity({ copy, rocker });
      return blanks.find((saved) => savedBlankIdentity(saved) === key) ?? null;
    },
    [blanks],
  );

  const saveBlank = useCallback(
    async (copy: BlankRecord, rocker: BlankRockerSpec): Promise<SavedBlankWrite> => {
      const key = savedBlankIdentity({ copy, rocker });
      if (!signedIn) {
        // Read fresh from storage, so two quick saves each build on the other.
        const current = parseSavedBlanksText(getSnapshot());
        const existing = current.find((saved) => savedBlankIdentity(saved) === key);
        if (existing) return { ok: true, blank: existing, created: false };
        const entry: SavedBlank = { id: newId(), copy, rocker };
        const next = withSavedBlank(current, entry);
        if (next === current) return { ok: false, message: SAVED_BLANKS_FULL_MESSAGE };
        writeToBrowser(next);
        emitChange();
        return { ok: true, blank: entry, created: true };
      }
      const existing = accountBlanks.find((saved) => savedBlankIdentity(saved) === key);
      if (existing) return { ok: true, blank: existing, created: false };
      try {
        const result = await saveUserBlank({ copy, rocker });
        if (!result.ok) return { ok: false, message: refusalMessage(result) };
        setAccountBlanks((list) => [...list, result.blank]);
        return { ok: true, blank: result.blank, created: true };
      } catch {
        return { ok: false, message: CONNECTION_MESSAGE };
      }
    },
    [signedIn, accountBlanks],
  );

  const updateBlank = useCallback(
    async (id: string, copy: BlankRecord, rocker: BlankRockerSpec): Promise<SavedBlankWrite> => {
      if (!signedIn) {
        const current = parseSavedBlanksText(getSnapshot());
        if (!current.some((saved) => saved.id === id)) return saveBlank(copy, rocker);
        const key = savedBlankIdentity({ copy, rocker });
        // Editing into a rocker another saved blank already has: keep that one, drop this one.
        const twin = current.find((saved) => saved.id !== id && savedBlankIdentity(saved) === key);
        if (twin) {
          writeToBrowser(withoutSavedBlank(current, id));
          emitChange();
          return { ok: true, blank: twin, created: false };
        }
        const next = withReplacedSavedBlank(current, id, copy, rocker);
        writeToBrowser(next);
        emitChange();
        return { ok: true, blank: { id, copy, rocker }, created: false };
      }
      try {
        const result = await updateUserBlank(id, { copy, rocker });
        if (!result.ok) {
          if (result.reason === "missing") return saveBlank(copy, rocker);
          return { ok: false, message: refusalMessage(result) };
        }
        setAccountBlanks((list) => list.map((saved) => (saved.id === id ? result.blank : saved)));
        return { ok: true, blank: result.blank, created: false };
      } catch {
        return { ok: false, message: CONNECTION_MESSAGE };
      }
    },
    [signedIn, saveBlank],
  );

  const removeBlank = useCallback(
    async (id: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (!signedIn) {
        const current = parseSavedBlanksText(getSnapshot());
        const next = withoutSavedBlank(current, id);
        if (next !== current) {
          writeToBrowser(next);
          emitChange();
        }
        return { ok: true };
      }
      try {
        const result = await removeUserBlank(id);
        if (!result.ok) return { ok: false, message: result.reason === "signed-out" ? SIGNED_OUT_MESSAGE : CONNECTION_MESSAGE };
        setAccountBlanks((list) => list.filter((saved) => saved.id !== id));
        return { ok: true };
      } catch {
        return { ok: false, message: CONNECTION_MESSAGE };
      }
    },
    [signedIn],
  );

  const value = useMemo<SavedBlanksContextValue>(
    () => ({ signedIn, blanks, findSaved, saveBlank, updateBlank, removeBlank }),
    [signedIn, blanks, findSaved, saveBlank, updateBlank, removeBlank],
  );

  return <SavedBlanksContext.Provider value={value}>{children}</SavedBlanksContext.Provider>;
}

export function useSavedBlanks(): SavedBlanksContextValue {
  const ctx = useContext(SavedBlanksContext);
  if (!ctx) {
    throw new Error("useSavedBlanks must be used within a SavedBlanksProvider");
  }
  return ctx;
}
