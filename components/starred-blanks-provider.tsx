"use client";

/**
 * Holds the blanks a shaper has starred in ROCKER's PICK A BLANK popup (quick 261015-ve9, D-06 — the
 * founder's decision of 2026-10-15), and is the one hook the popup reads them through. A near copy
 * of `components/blank-makers-provider.tsx`'s browser half.
 *
 * Like Blank Makers, stars describe how a shaper works, not what a board is: they live outside the
 * design store and outside a saved board's own data, so starring or unstarring a blank never picks
 * it, never changes a board and never marks one unsaved.
 *
 * In part 1 (this task) stars live in this browser only, in localStorage — no cookie, no account, no
 * Server Action. Part 2 adds a `handoff` prop and the background account write exactly where
 * `BlankMakersProvider` has them, and a browser's stars then JOIN the account's at sign-in.
 *
 * The value is a list, and `useSyncExternalStore` compares snapshots with `Object.is`, so the
 * snapshot is the RAW stored string (a primitive, equal to itself while storage is unchanged) and it
 * is parsed once per change, in a `useMemo`, through the untrusted-value allow-list in
 * `lib/starred-blanks-preference.ts`. The server snapshot is "no stars": the stars only render inside
 * the popup, which only ever opens in the browser, so there is no hydration mismatch to guard.
 */

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  parseStarredBlanksText,
  STARRED_BLANKS_STORAGE_KEY,
  starKey,
  starredBlanksJson,
  withStar,
  type StarredBlank,
} from "@/lib/starred-blanks-preference";

/* -- stored preference, as an external store ------------------------------------------- */

/** Subscribers for same-tab writes. The `storage` event only fires in *other* tabs. */
const storeListeners = new Set<() => void>();

/**
 * Where the stars live for the rest of this page's life when the browser refuses storage (Safari
 * private mode, blocked-storage contexts): they still show, they just won't survive a reload. Only
 * ever read when reading `localStorage` itself throws.
 */
let blockedStorageRaw: string | null = null;

const SERVER_RAW = "[]";

function emitChange() {
  for (const listener of storeListeners) listener();
}

function subscribe(onStoreChange: () => void) {
  storeListeners.add(onStoreChange);
  // Another tab starring a blank fires `storage` here, so its star shows in this tab too.
  window.addEventListener("storage", onStoreChange);
  return () => {
    storeListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** The raw stored string — never parsed here, so the snapshot stays a stable primitive. */
function getStoredRaw(): string | null {
  try {
    return localStorage.getItem(STARRED_BLANKS_STORAGE_KEY);
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

/** Writes the stars to localStorage, falling back to page memory when storage is blocked. */
function writeToBrowser(next: readonly StarredBlank[]) {
  const raw = starredBlanksJson(next);
  blockedStorageRaw = raw;
  try {
    localStorage.setItem(STARRED_BLANKS_STORAGE_KEY, raw);
  } catch {
    // Blocked storage: the page-memory copy above keeps the star on screen until a reload.
  }
}

/* -------------------------------------------------------------------------------------- */

export interface StarredBlanksContextValue {
  /** The starred blanks, in the order they were starred. */
  starred: readonly StarredBlank[];
  /** Is this blank starred? Matched by maker and name. */
  isStarred: (vendor: string, name: string) => boolean;
  /** Stars (`on: true`) or unstars one blank. Applies at once; never touches the board. */
  setStarred: (vendor: string, name: string, on: boolean) => void;
}

const StarredBlanksContext = createContext<StarredBlanksContextValue | null>(null);

export function StarredBlanksProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const starred = useMemo(() => parseStarredBlanksText(raw), [raw]);
  const keys = useMemo(() => new Set(starred.map(([vendor, name]) => starKey(vendor, name))), [starred]);
  const isStarred = useCallback((vendor: string, name: string) => keys.has(starKey(vendor, name)), [keys]);

  const setStarred = useCallback((vendor: string, name: string, on: boolean) => {
    // Read fresh from the store rather than this render's list, so two quick taps each build on
    // the other.
    const current = parseStarredBlanksText(getSnapshot());
    const next = withStar(current, vendor, name, on);
    if (next === current) return;
    writeToBrowser(next);
    emitChange();
  }, []);

  const value = useMemo<StarredBlanksContextValue>(
    () => ({ starred, isStarred, setStarred }),
    [starred, isStarred, setStarred],
  );

  return <StarredBlanksContext.Provider value={value}>{children}</StarredBlanksContext.Provider>;
}

export function useStarredBlanks(): StarredBlanksContextValue {
  const ctx = useContext(StarredBlanksContext);
  if (!ctx) {
    throw new Error("useStarredBlanks must be used within a StarredBlanksProvider");
  }
  return ctx;
}
