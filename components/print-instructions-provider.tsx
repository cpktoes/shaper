"use client";

/**
 * Holds the shaper's "Include Rail Band Instructions in Print" preference and is the one hook
 * both the rails sidebar and the summary screen's mirror checkbox read/write through — mirrors
 * `components/units-provider.tsx` almost exactly (D-07, PRNT-05).
 *
 * This describes how the shaper prints, not what the board is (D-06): it lives outside the design
 * store and outside a saved board's own data, so ticking it never marks a board dirty, never
 * triggers an autosave, and never enters the design snapshot.
 *
 * The background account write (a bounded retry queue) and the adoption/promotion effects below
 * are built on `lib/preference-handoff.ts`'s generic helpers — the same ones
 * `components/units-provider.tsx` now calls through `lib/units-preference.ts`'s thin wrappers.
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
import { savePrintRailInstructionsPreference } from "@/app/actions/print-instructions";
import {
  PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY,
  parsePrintRailInstructionsPreference,
  printRailInstructionsCookieString,
  type PrintRailInstructionsHandoff,
} from "@/lib/print-instructions-preference";
import { createPreferenceWriteQueue, type PreferenceWriteQueue } from "@/lib/preference-handoff";

/* -- stored preference, as an external store ------------------------------------------- */

/** Subscribers for same-tab writes. The `storage` event only fires in *other* tabs. */
const storeListeners = new Set<() => void>();

function emitPreferenceChange() {
  for (const listener of storeListeners) listener();
}

function subscribeToStoredPreference(onStoreChange: () => void) {
  storeListeners.add(onStoreChange);
  // Free cross-tab sync: another tab ticking the box fires `storage` here, and this provider
  // re-renders without anything else being wired up.
  window.addEventListener("storage", onStoreChange);
  return () => {
    storeListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getStoredPreference(): boolean | null {
  try {
    return parsePrintRailInstructionsPreference(localStorage.getItem(PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY));
  } catch {
    // Safari private mode and blocked-storage contexts throw on access.
    return null;
  }
}

/* -------------------------------------------------------------------------------------- */

export interface PrintInstructionsContextValue {
  /** Whether the box is currently ticked — what the shaper picked, or what the server resolved
   * for an untouched browser. */
  included: boolean;
  setIncluded: (next: boolean) => void;
}

const PrintInstructionsContext = createContext<PrintInstructionsContextValue | null>(null);

export function PrintInstructionsProvider({
  handoff,
  children,
}: {
  /** The server's resolution of this request — the cookie (this task) or the account value
   * (Task 2), reconciled by `decidePrintRailInstructionsHandoff`. */
  handoff: PrintRailInstructionsHandoff;
  children: ReactNode;
}) {
  // Mirrors UnitsProvider's WR-02 fix: the server-resolved value is authoritative until the
  // browser has actually been reconciled to it, so a stale localStorage value from another
  // device or an earlier signed-out session can never flash for one frame before the adoption
  // effect (added in Task 3) corrects it.
  const reconciledRef = useRef(handoff.adoptIntoBrowser === null);

  const getSnapshot = useCallback(() => {
    if (!reconciledRef.current) return handoff.included;
    return getStoredPreference() ?? handoff.included;
  }, [handoff.included]);
  const getServerSnapshot = useCallback(() => handoff.included, [handoff.included]);

  const included = useSyncExternalStore(subscribeToStoredPreference, getSnapshot, getServerSnapshot);

  /* -- the background account write --------------------------------------------------- */
  // The serialization policy — "at most one save in flight, the last pick always lands last" —
  // lives in lib/preference-handoff.ts's `createPreferenceWriteQueue`, pure and unit-tested the
  // same way units' own queue is. This provider only supplies the real Server Action and real
  // setTimeout/clearTimeout, and forwards every pick to `request`.
  const writeQueueRef = useRef<PreferenceWriteQueue<boolean> | null>(null);
  function getWriteQueue(): PreferenceWriteQueue<boolean> {
    if (writeQueueRef.current === null) {
      writeQueueRef.current = createPreferenceWriteQueue<boolean>({
        save: savePrintRailInstructionsPreference,
        setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
        clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      });
    }
    return writeQueueRef.current;
  }

  const scheduleAccountWrite = useCallback((next: boolean) => {
    getWriteQueue().request(next);
  }, []);

  // Cancels any in-flight retry timer on unmount — nothing should keep firing after the provider
  // is gone.
  useEffect(() => {
    return () => {
      writeQueueRef.current?.dispose();
    };
  }, []);

  const setIncluded = useCallback((next: boolean) => {
    try {
      localStorage.setItem(PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY, String(next));
      document.cookie = printRailInstructionsCookieString(next);
    } catch {
      // Storage blocked — the choice still applies for this render (the emit below), it just
      // won't survive a reload. Better than refusing to tick.
    }
    // A click always wins immediately, reconciled or not — `getSnapshot` must reflect it on the
    // very next read, so this flips before the emit below (mirrors WR-02).
    reconciledRef.current = true;
    // Emitted synchronously, on the click itself — a passive effect would run after paint,
    // showing one frame of the old value first. The screen has already switched by the time the
    // account write below even starts — the write can never block, delay or revert it.
    emitPreferenceChange();
    scheduleAccountWrite(next);
  }, [scheduleAccountWrite]);

  // Adopts a signed-in shaper's account choice into the browser. Only writes when the browser
  // doesn't already agree, so it never stomps a value that's already correct. Either way this
  // effect ends by flipping `reconciledRef` to `true` and emitting — from this point on
  // `getSnapshot` is safe to read localStorage again, because it now agrees with `handoff`.
  useEffect(() => {
    if (handoff.adoptIntoBrowser === null) return; // nothing to reconcile — reconciledRef started true
    if (getStoredPreference() === handoff.adoptIntoBrowser) {
      reconciledRef.current = true;
      emitPreferenceChange();
      return;
    }
    try {
      localStorage.setItem(PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY, String(handoff.adoptIntoBrowser));
      document.cookie = printRailInstructionsCookieString(handoff.adoptIntoBrowser);
    } catch {
      // Storage blocked — this session still shows the account's choice via `handoff.included`
      // (the initial snapshot), it just won't be mirrored into the browser for next time.
    }
    reconciledRef.current = true;
    emitPreferenceChange();
  }, [handoff.adoptIntoBrowser]);

  // Promotes a browser's explicit pick into an account that has none — an account that already
  // had a value never reaches this branch (`handoff.promoteToAccount` is only ever non-null when
  // the account was empty; see decidePrintRailInstructionsHandoff). Fires once on mount, guarded
  // by a ref so a re-render can't fire it twice, through the same write-and-retry helper a click
  // uses (fire-and-forget). Never fires for a default nobody chose (D-07): `promoteToAccount` is
  // only ever non-null for an explicit browser value, never for the fallback.
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

  const value = useMemo(() => ({ included, setIncluded }), [included, setIncluded]);

  return <PrintInstructionsContext.Provider value={value}>{children}</PrintInstructionsContext.Provider>;
}

export function usePrintRailInstructions(): PrintInstructionsContextValue {
  const ctx = useContext(PrintInstructionsContext);
  if (!ctx) {
    throw new Error("usePrintRailInstructions must be used within a PrintInstructionsProvider");
  }
  return ctx;
}
