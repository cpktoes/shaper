"use client";

/**
 * Holds the shaper's five fit and tip defaults (D-09) — Extra Length, Extra Center Thickness and
 * Width Margin (the three rules that decide which real blanks a board fits into), and the Nose and
 * Tail Tip thicknesses a brand-new board starts from — and is the one hook every screen reads them
 * through. The third instance of the provider pattern, after `components/units-provider.tsx` and
 * `components/print-instructions-provider.tsx`, and a near copy of the second.
 *
 * Like the other two, these describe how a shaper works, not what a board is: they live outside
 * the design store and outside a saved board's own data, so changing one never marks a board
 * dirty and never rewrites a board already started (every board stores its own tips).
 *
 * The one structural difference from its siblings is the shape of the value: five numbers rather
 * than one word or one tick. `useSyncExternalStore` compares snapshots with `Object.is`, so a
 * snapshot function that parsed storage into a fresh object on every call would never compare
 * equal to itself and would re-render forever. The snapshot here is therefore the RAW stored
 * string — a primitive, equal to itself whenever storage has not changed — and it is parsed once
 * per change, in a `useMemo`, through the untrusted-value allow-list in
 * `lib/fit-defaults-preference.ts` (T-11-23, T-11-25).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { saveFitDefaultsPreference } from "@/app/actions/fit-defaults";
import { FitDefaultsDialog } from "@/components/fit-defaults-dialog";
import {
  EMPTY_FIT_DEFAULTS_PREFERENCE,
  FIT_DEFAULTS_STORAGE_KEY,
  fitDefaultsCookieString,
  mergeFitDefaultsPatch,
  parseFitDefaultsPreference,
  resolveFitDefaults,
  toFitSettings,
  type FitDefaults,
  type FitDefaultsHandoff,
  type FitDefaultsKey,
  type FitDefaultsPatch,
  type FitDefaultsPreference,
} from "@/lib/fit-defaults-preference";
import { createPreferenceWriteQueue, type PreferenceWriteQueue } from "@/lib/preference-handoff";
import type { FitSettings } from "@/lib/geometry/blank";
import type { Mm } from "@/lib/geometry/units";

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
  // Free cross-tab sync: another tab changing a default fires `storage` here, and this provider
  // re-renders without anything else being wired up.
  window.addEventListener("storage", onStoreChange);
  return () => {
    storeListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** The raw stored string — never parsed here, so the snapshot stays a stable primitive. */
function getStoredRaw(): string | null {
  try {
    return localStorage.getItem(FIT_DEFAULTS_STORAGE_KEY);
  } catch {
    return blockedStorageRaw;
  }
}

/** Parses a raw stored string through the allow-list; anything unreadable reads as five nulls,
 * which render as the five defaults. Never throws. */
function parseStoredRaw(raw: string): FitDefaultsPreference {
  try {
    return parseFitDefaultsPreference(JSON.parse(raw));
  } catch {
    return { ...EMPTY_FIT_DEFAULTS_PREFERENCE };
  }
}

/** Writes a preference into the browser — localStorage and the cookie the server reads for the
 * next request's first paint — falling back to page memory when storage is blocked. */
function writeToBrowser(next: FitDefaultsPreference) {
  const raw = JSON.stringify(next);
  blockedStorageRaw = raw;
  try {
    localStorage.setItem(FIT_DEFAULTS_STORAGE_KEY, raw);
    document.cookie = fitDefaultsCookieString(next);
  } catch {
    // Storage blocked — the value still applies for this page (the emit that follows every
    // write), it just won't survive a reload. Better than refusing the value.
  }
}

/* -------------------------------------------------------------------------------------- */

export interface FitDefaultsContextValue {
  /** What the shaper has chosen — `null` for any setting they have not touched. */
  preference: FitDefaultsPreference;
  /** Every setting resolved to a value: the shaper's own, or its default. */
  defaults: FitDefaults;
  /** Just the three fit rules the blank list filters by. */
  settings: FitSettings;
  /** Sets one default (or, with `null`, returns it to "not chosen"). Applies at once. */
  setDefault: (key: FitDefaultsKey, value: Mm | null) => void;
  /** Returns all five to "not chosen", so every one reads its default again. */
  restoreDefaults: () => void;
  /** Opens the Fit & Tip Defaults dialog, rendered once by this provider. */
  openDialog: () => void;
}

const FitDefaultsContext = createContext<FitDefaultsContextValue | null>(null);

export function FitDefaultsProvider({
  handoff,
  children,
}: {
  /** The server's resolution of this request — the cookie, and when signed in the account,
   * reconciled field by field by `decideFitDefaultsHandoff`. */
  handoff: FitDefaultsHandoff;
  children: ReactNode;
}) {
  // What the server rendered, as the same kind of raw string the browser stores. `JSON.stringify`
  // of the same five fields always gives the same string, so this is stable across renders even
  // if `handoff` were ever handed down as a fresh object.
  const serverRaw = JSON.stringify(handoff.preference);

  // Mirrors UnitsProvider's WR-02 fix: the server-resolved values are authoritative until the
  // browser has actually been reconciled to them, so a stale localStorage value from another
  // device or an earlier signed-out session can never flash for one frame before the adoption
  // effect below corrects it.
  const reconciledRef = useRef(handoff.adoptIntoBrowser === null);

  const getSnapshot = useCallback(() => {
    if (!reconciledRef.current) return serverRaw;
    return getStoredRaw() ?? serverRaw;
  }, [serverRaw]);
  const getServerSnapshot = useCallback(() => serverRaw, [serverRaw]);

  const raw = useSyncExternalStore(subscribeToStoredPreference, getSnapshot, getServerSnapshot);
  const preference = useMemo(() => parseStoredRaw(raw), [raw]);

  /* -- the background account write --------------------------------------------------- */
  // "At most one save in flight, the last value always lands last" lives in
  // lib/preference-handoff.ts's `createPreferenceWriteQueue`, pure and unit-tested. This provider
  // only supplies the real Server Action and real timers. Signed out, the action resolves quietly
  // without writing anything — a signed-out shaper's defaults live in the browser alone.
  //
  // Each save is a PATCH of only the settings changed (WR-02), never the whole five — so a save
  // from this tab can't wipe a setting another device chose and this tab never touched. Because
  // the queue keeps only the LAST value asked for, patches made while a save is in flight are
  // gathered into `unsavedPatchRef` and the queue always carries all of them together; a key
  // leaves the gathered patch once a save carrying that exact value has succeeded.
  const unsavedPatchRef = useRef<FitDefaultsPatch>({});
  const writeQueueRef = useRef<PreferenceWriteQueue<FitDefaultsPatch> | null>(null);
  function getWriteQueue(): PreferenceWriteQueue<FitDefaultsPatch> {
    if (writeQueueRef.current === null) {
      writeQueueRef.current = createPreferenceWriteQueue<FitDefaultsPatch>({
        save: async (sent) => {
          await saveFitDefaultsPreference(sent);
          const unsaved = unsavedPatchRef.current;
          for (const key of Object.keys(sent) as FitDefaultsKey[]) {
            if (Object.prototype.hasOwnProperty.call(unsaved, key) && unsaved[key] === sent[key]) delete unsaved[key];
          }
        },
        setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
        clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      });
    }
    return writeQueueRef.current;
  }

  const scheduleAccountWrite = useCallback((patch: FitDefaultsPatch) => {
    unsavedPatchRef.current = { ...unsavedPatchRef.current, ...patch };
    getWriteQueue().request({ ...unsavedPatchRef.current });
  }, []);

  // Cancels any pending retry timer on unmount — nothing should keep firing after the provider
  // is gone.
  useEffect(() => {
    return () => {
      writeQueueRef.current?.dispose();
    };
  }, []);

  /** Lays `patch` over what the browser holds, applies it at once and saves ONLY the patch in the
   * background — shared by both setters. */
  const commit = useCallback(
    (patch: FitDefaultsPatch) => {
      // Read fresh from the store rather than from this render's `preference`, so two commits in
      // the same tick (a blur that lands just before an Enter) each build on the other.
      const next = mergeFitDefaultsPatch(parseStoredRaw(getSnapshot()), patch);
      writeToBrowser(next);
      // A committed value always wins immediately, reconciled or not — `getSnapshot` must reflect
      // it on the very next read, so this flips before the emit below (mirrors WR-02).
      reconciledRef.current = true;
      // Emitted synchronously, on the commit itself, so the new value is on screen before the
      // account write below even starts — that write can never block, delay or revert it.
      emitPreferenceChange();
      scheduleAccountWrite(patch);
    },
    [scheduleAccountWrite, getSnapshot],
  );

  // One setting: only that key is sent, so the account's other four stay as they are.
  const setDefault = useCallback(
    (key: FitDefaultsKey, value: Mm | null) => {
      commit({ [key]: value });
    },
    [commit],
  );

  // An intentional wipe: all five sent as `null` explicitly.
  const restoreDefaults = useCallback(() => {
    commit({ ...EMPTY_FIT_DEFAULTS_PREFERENCE });
  }, [commit]);

  // Adopts a signed-in shaper's account values into the browser. Only writes when the browser
  // doesn't already agree, so it never stomps values that are already correct. Either way this
  // effect ends by flipping `reconciledRef` to `true` and emitting — from here on `getSnapshot`
  // is safe to read storage again, because it now agrees with `handoff`.
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

  // Promotes a browser's explicit picks into an account that has none for them — a field the
  // account already held is never overwritten (`decideFitDefaultsHandoff`'s patch carries only
  // the fields the account lacked). Fires once on mount, guarded by a ref so a re-render can't fire it twice,
  // through the same write-and-retry queue a commit uses. Never fires for a default nobody chose.
  const promotedRef = useRef(false);
  useEffect(() => {
    if (handoff.promoteToAccount === null) return;
    if (promotedRef.current) return;
    promotedRef.current = true;
    scheduleAccountWrite(handoff.promoteToAccount);
    // Only ever runs once per mount (guarded above) — deliberately not re-triggered by
    // `scheduleAccountWrite` identity changes, which never change after mount anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff.promoteToAccount]);

  /* -- the dialog ----------------------------------------------------------------------- */
  // Held here, not in the gear menu: the menu popup unmounts the moment it closes, and a dialog
  // rendered inside it would vanish with it.
  const [dialogOpen, setDialogOpen] = useState(false);
  const openDialog = useCallback(() => setDialogOpen(true), []);

  const value = useMemo<FitDefaultsContextValue>(() => {
    const defaults = resolveFitDefaults(preference);
    return {
      preference,
      defaults,
      settings: toFitSettings(defaults),
      setDefault,
      restoreDefaults,
      openDialog,
    };
  }, [preference, setDefault, restoreDefaults, openDialog]);

  return (
    <FitDefaultsContext.Provider value={value}>
      {children}
      <FitDefaultsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </FitDefaultsContext.Provider>
  );
}

export function useFitDefaults(): FitDefaultsContextValue {
  const ctx = useContext(FitDefaultsContext);
  if (!ctx) {
    throw new Error("useFitDefaults must be used within a FitDefaultsProvider");
  }
  return ctx;
}
