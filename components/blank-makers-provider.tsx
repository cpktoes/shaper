"use client";

/**
 * Holds which blank makers a shaper has switched off in the gear menu's BLANK MAKERS tick boxes
 * (quick task 260926-wmf), and is the one hook the menu and the ROCKER blank list read it through.
 * The fourth instance of the provider pattern, after `components/units-provider.tsx`,
 * `components/print-instructions-provider.tsx` and `components/fit-defaults-provider.tsx`, and a
 * near copy of the last one without its dialog.
 *
 * Like Units, this describes how a shaper works, not what a board is: it lives outside the design
 * store and outside a saved board's own data, so ticking or unticking a maker never marks a board
 * unsaved and never changes the blank a board already has.
 *
 * The value is a list, and `useSyncExternalStore` compares snapshots with `Object.is`, so the
 * snapshot is the RAW stored string (a primitive, equal to itself while storage is unchanged) and
 * it is parsed once per change, in a `useMemo`, through the untrusted-value allow-list in
 * `lib/blank-makers-preference.ts`.
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
import { saveBlankMakersPreference } from "@/app/actions/blank-makers";
import {
  BLANK_MAKERS_STORAGE_KEY,
  parseHiddenBlankMakers,
  withMakerShown,
  writeBlankMakersToBrowser,
  type BlankMakersHandoff,
} from "@/lib/blank-makers-preference";
import type { BlankVendor } from "@/lib/blanks/vendors";
import { createPreferenceWriteQueue, type PreferenceWriteQueue } from "@/lib/preference-handoff";

/* -- stored preference, as an external store ------------------------------------------- */

/** Subscribers for same-tab writes. The `storage` event only fires in *other* tabs. */
const storeListeners = new Set<() => void>();

/**
 * Where a pick lives for the rest of this page's life when the browser refuses storage (Safari
 * private mode, blocked-storage contexts): the choice still applies on screen, it just won't
 * survive a reload. Only ever read when reading `localStorage` itself throws.
 */
let blockedStorageRaw: string | null = null;

function emitPreferenceChange() {
  for (const listener of storeListeners) listener();
}

function subscribeToStoredPreference(onStoreChange: () => void) {
  storeListeners.add(onStoreChange);
  // Free cross-tab sync: another tab ticking a maker fires `storage` here.
  window.addEventListener("storage", onStoreChange);
  return () => {
    storeListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** The raw stored string — never parsed here, so the snapshot stays a stable primitive. */
function getStoredRaw(): string | null {
  try {
    return localStorage.getItem(BLANK_MAKERS_STORAGE_KEY);
  } catch {
    return blockedStorageRaw;
  }
}

/** Parses a raw stored string through the allow-list; anything unreadable reads as every maker
 * on. Never throws. */
function parseStoredRaw(raw: string): BlankVendor[] {
  try {
    return parseHiddenBlankMakers(JSON.parse(raw)) ?? [];
  } catch {
    return [];
  }
}

/** Writes the hidden list into the browser — localStorage and the cookie the server reads for the
 * next request's first paint — each tried on its own, falling back to page memory when storage is
 * blocked. */
function writeToBrowser(next: readonly BlankVendor[]) {
  blockedStorageRaw = JSON.stringify(next);
  writeBlankMakersToBrowser(next, {
    setStorage: (raw) => localStorage.setItem(BLANK_MAKERS_STORAGE_KEY, raw),
    setCookie: (cookie) => {
      document.cookie = cookie;
    },
  });
}

/* -------------------------------------------------------------------------------------- */

export interface BlankMakersContextValue {
  /** The makers the shaper has switched off, in catalogue order — `[]` means every maker on. */
  hidden: readonly BlankVendor[];
  /** Ticks (`shown: true`) or unticks one maker. Applies at once and saves the whole list. The
   * last maker still shown can't be unticked — that call does nothing. */
  setMakerShown: (vendor: BlankVendor, shown: boolean) => void;
}

const BlankMakersContext = createContext<BlankMakersContextValue | null>(null);

export function BlankMakersProvider({
  handoff,
  children,
}: {
  /** The server's resolution of this request — the cookie, and when signed in the account,
   * reconciled by `decideBlankMakersHandoff`. */
  handoff: BlankMakersHandoff;
  children: ReactNode;
}) {
  // What the server rendered, as the same kind of raw string the browser stores.
  const serverRaw = JSON.stringify(handoff.hidden);

  // Mirrors UnitsProvider's WR-02 fix: the server-resolved value is authoritative until the
  // browser has been reconciled to it, so a stale localStorage value can never flash for a frame.
  const reconciledRef = useRef(handoff.adoptIntoBrowser === null);

  const getSnapshot = useCallback(() => {
    if (!reconciledRef.current) return serverRaw;
    return getStoredRaw() ?? serverRaw;
  }, [serverRaw]);
  const getServerSnapshot = useCallback(() => serverRaw, [serverRaw]);

  const raw = useSyncExternalStore(subscribeToStoredPreference, getSnapshot, getServerSnapshot);
  const hidden = useMemo(() => parseStoredRaw(raw), [raw]);

  /* -- the background account write --------------------------------------------------- */
  // "At most one save in flight, the last value always lands last" lives in
  // lib/preference-handoff.ts. The whole hidden list is one value, like Units, so the queue simply
  // carries the latest list. Signed out, the action resolves quietly without writing.
  const writeQueueRef = useRef<PreferenceWriteQueue<BlankVendor[]> | null>(null);
  const scheduleAccountWrite = useCallback((next: BlankVendor[]) => {
    if (writeQueueRef.current === null) {
      writeQueueRef.current = createPreferenceWriteQueue<BlankVendor[]>({
        save: (value) => saveBlankMakersPreference(value),
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

  const setMakerShown = useCallback(
    (vendor: BlankVendor, shown: boolean) => {
      // Read fresh from the store rather than this render's `hidden`, so two ticks in the same
      // tick each build on the other.
      const current = parseStoredRaw(getSnapshot());
      const next = withMakerShown(current, vendor, shown);
      // Nothing changed (including the refused "untick the last maker") — nothing to write.
      if (next.length === current.length && next.every((maker, i) => maker === current[i])) return;
      writeToBrowser(next);
      // A pick always wins immediately, reconciled or not — flip before the emit below.
      reconciledRef.current = true;
      // Emitted synchronously, so the list changes on this same tap, before the account write.
      emitPreferenceChange();
      scheduleAccountWrite(next);
    },
    [getSnapshot, scheduleAccountWrite],
  );

  // Adopts a signed-in shaper's account value into the browser, writing only when the browser
  // doesn't already agree; then storage is safe to read again.
  useEffect(() => {
    if (handoff.adoptIntoBrowser === null) return; // nothing to reconcile — reconciledRef started true
    const adopted = JSON.stringify(handoff.adoptIntoBrowser);
    const stored = getStoredRaw();
    if (stored === null || JSON.stringify(parseStoredRaw(stored)) !== adopted) {
      writeToBrowser(handoff.adoptIntoBrowser);
    }
    reconciledRef.current = true;
    emitPreferenceChange();
  }, [handoff.adoptIntoBrowser]);

  // Promotes a browser's explicit pick into an account that has none. Fires once on mount,
  // guarded by a ref, through the same write-and-retry queue. Never fires for a default nobody
  // chose.
  const promotedRef = useRef(false);
  useEffect(() => {
    if (handoff.promoteToAccount === null) return;
    if (promotedRef.current) return;
    promotedRef.current = true;
    scheduleAccountWrite(handoff.promoteToAccount);
    // Only ever runs once per mount (guarded above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff.promoteToAccount]);

  const value = useMemo<BlankMakersContextValue>(() => ({ hidden, setMakerShown }), [hidden, setMakerShown]);

  return <BlankMakersContext.Provider value={value}>{children}</BlankMakersContext.Provider>;
}

export function useBlankMakers(): BlankMakersContextValue {
  const ctx = useContext(BlankMakersContext);
  if (!ctx) {
    throw new Error("useBlankMakers must be used within a BlankMakersProvider");
  }
  return ctx;
}
