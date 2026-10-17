"use client";

/**
 * Holds the blanks a shaper has starred in ROCKER's PICK A BLANK popup (quick 261015-ve9, D-06 — the
 * founder's decision of 2026-10-15), and is the one hook the popup reads them through. A near copy
 * of `components/blank-makers-provider.tsx`.
 *
 * Like Blank Makers, stars describe how a shaper works, not what a board is: they live outside the
 * design store and outside a saved board's own data, so starring or unstarring a blank never picks
 * it, never changes a board and never marks one unsaved (D-07).
 *
 * Part 2 (quick 261016-usz, 2026-10-16) puts the stars on the shaper's account. The server hands
 * down one of three states (`lib/starred-blanks-server.ts`):
 * - signed out: stars live in this browser only, exactly as part 1 shipped them, and nothing is ever
 *   sent to the server (D-02);
 * - signed in: the account is where stars live (D-03). On load the account's list REPLACES this
 *   browser's copy, so a star removed on the phone stays removed on the computer; stars made here
 *   while signed out JOIN it first, after the account's own, and the joined list is saved (D-04).
 *   Every star and unstar then shows at once and saves to the account in the background, in order,
 *   the last one winning (`lib/preference-handoff.ts`'s write queue);
 * - account unreadable: shown and kept like signed out — nothing replaced, saved or cleared — so a
 *   database hiccup can never empty the account's real list (P-3).
 *
 * Which stars are still waiting to join an account is a second list in localStorage, under
 * `shaper-starred-blanks-to-join` (P-1). A browser from part 1 has never written it, so all its stars
 * join at its first signed-in load (P-2). Every rule about which star goes where lives in
 * `lib/starred-blanks-preference.ts` (`decideStarredBlanksHandoff`, `applyStarChange`); this file
 * only reads storage, calls those rules and writes what they say.
 *
 * The browser reconciles with the account when the page loads and when the shaper signs in or out —
 * never on an ordinary server refresh (a board save refreshes the page, and replacing the stars then
 * could drop a star whose save is still on its way, P-4). There is no cookie (D-05).
 *
 * The value is a list, and `useSyncExternalStore` compares snapshots with `Object.is`, so the
 * snapshot is the RAW stored string (a primitive, equal to itself while storage is unchanged) and it
 * is parsed once per change, in a `useMemo`, through the untrusted-value allow-list in
 * `lib/starred-blanks-preference.ts`. The server snapshot is "no stars": the stars only render inside
 * the popup, which only ever opens in the browser, so there is no hydration mismatch to guard.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { saveStarredBlanksPreference } from "@/app/actions/starred-blanks";
import { createPreferenceWriteQueue, type PreferenceWriteQueue } from "@/lib/preference-handoff";
import {
  applyStarChange,
  decideStarredBlanksHandoff,
  parseStarredBlanksText,
  STARRED_BLANKS_STORAGE_KEY,
  STARRED_BLANKS_TO_JOIN_STORAGE_KEY,
  starKey,
  starredBlanksJson,
  type StarredBlank,
  type StarredBlanksHandoff,
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

/** The same page-memory fallback for the waiting-to-join list (quick 261016-usz, P-1). */
let blockedToJoinRaw: string | null = null;

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

/** The raw waiting-to-join list, or `null` when this browser has never written one (P-2). */
function getToJoinRaw(): string | null {
  try {
    return localStorage.getItem(STARRED_BLANKS_TO_JOIN_STORAGE_KEY);
  } catch {
    return blockedToJoinRaw;
  }
}

/** The waiting-to-join list through the same allow-list as the stars, or `null` when never written. */
function readToJoin(): StarredBlank[] | null {
  const raw = getToJoinRaw();
  return raw === null ? null : parseStarredBlanksText(raw);
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

/** Writes the waiting-to-join list, the same way. */
function writeToJoinToBrowser(next: readonly StarredBlank[]) {
  const raw = starredBlanksJson(next);
  blockedToJoinRaw = raw;
  try {
    localStorage.setItem(STARRED_BLANKS_TO_JOIN_STORAGE_KEY, raw);
  } catch {
    // Blocked storage: kept in page memory until a reload.
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

export function StarredBlanksProvider({
  handoff,
  children,
}: {
  /** The server's read of this request: signed out, the account's stars, or unreadable (D-03, P-3). */
  handoff: StarredBlanksHandoff;
  children: ReactNode;
}) {
  // Signed in, the account's list is authoritative until this browser has been reconciled to it,
  // so a stale browser copy can never flash for a frame (BlankMakersProvider's WR-02 rule).
  const accountRaw = handoff.kind === "signed-in" ? starredBlanksJson(handoff.account) : null;
  const reconciledRef = useRef(handoff.kind !== "signed-in");

  const getSnapshot = useCallback(() => {
    if (!reconciledRef.current && accountRaw !== null) return accountRaw;
    return getStoredRaw() ?? SERVER_RAW;
  }, [accountRaw]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_RAW);
  const starred = useMemo(() => parseStarredBlanksText(raw), [raw]);
  const keys = useMemo(() => new Set(starred.map(([vendor, name]) => starKey(vendor, name))), [starred]);
  const isStarred = useCallback((vendor: string, name: string) => keys.has(starKey(vendor, name)), [keys]);

  /* -- the background account write --------------------------------------------------- */
  // "At most one save in flight, the last list always lands last" lives in
  // lib/preference-handoff.ts (D-03). The whole star list is one value, so the queue simply carries
  // the latest list.
  const writeQueueRef = useRef<PreferenceWriteQueue<StarredBlank[]> | null>(null);
  const scheduleAccountWrite = useCallback((next: StarredBlank[]) => {
    if (writeQueueRef.current === null) {
      writeQueueRef.current = createPreferenceWriteQueue<StarredBlank[]>({
        save: (value) => saveStarredBlanksPreference(value),
        setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
        clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      });
    }
    writeQueueRef.current.request(next);
  }, []);

  // Cancels any pending retry timer on unmount.
  useEffect(() => {
    return () => {
      writeQueueRef.current?.dispose();
    };
  }, []);

  // Reconciles this browser with the account on the first load, and again only when the shaper
  // signs in or out (the hand-off's kind changes) — never on an ordinary refresh, so a star whose
  // save is still on its way is never replaced by the account's older list (P-4). Every rule is
  // decideStarredBlanksHandoff's; this only reads storage and writes what it says.
  const lastReconciledKindRef = useRef<StarredBlanksHandoff["kind"] | null>(null);
  useEffect(() => {
    if (lastReconciledKindRef.current === handoff.kind) return;
    lastReconciledKindRef.current = handoff.kind;
    const decision = decideStarredBlanksHandoff({
      handoff,
      browser: parseStarredBlanksText(getStoredRaw()),
      toJoin: readToJoin(),
    });
    if (decision.writeBrowser !== null) writeToBrowser(decision.writeBrowser);
    if (decision.writeToJoin !== null) writeToJoinToBrowser(decision.writeToJoin);
    reconciledRef.current = true;
    emitChange();
    if (decision.saveToAccount !== null) scheduleAccountWrite(decision.saveToAccount);
  }, [handoff, scheduleAccountWrite]);

  const savesToAccount = handoff.kind === "signed-in";
  const setStarred = useCallback(
    (vendor: string, name: string, on: boolean) => {
      // Read fresh from the store rather than this render's list, so two quick taps each build on
      // the other.
      const change = applyStarChange({
        savesToAccount,
        starred: parseStarredBlanksText(getSnapshot()),
        toJoin: readToJoin(),
        vendor,
        name,
        on,
      });
      if (change === null) return;
      writeToBrowser(change.starred);
      if (change.toJoin !== null) writeToJoinToBrowser(change.toJoin);
      // A tap always wins immediately, reconciled or not — flip before the emit below.
      reconciledRef.current = true;
      // Emitted synchronously, so the star fills on this same tap, before any account save (D-03).
      emitChange();
      // Signed out or unreadable, `save` is always null: nothing leaves the browser (D-02, P-3).
      if (change.save !== null) scheduleAccountWrite(change.save);
    },
    [savesToAccount, getSnapshot, scheduleAccountWrite],
  );

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
