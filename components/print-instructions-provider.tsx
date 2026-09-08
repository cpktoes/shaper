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
 * For this task there is no account write — `setIncluded` only writes localStorage and the
 * cookie. Task 3 wires the background account write (a bounded retry queue, mirroring units')
 * and the adoption/promotion effects `UnitsProvider` has.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY,
  parsePrintRailInstructionsPreference,
  printRailInstructionsCookieString,
  type PrintRailInstructionsHandoff,
} from "@/lib/print-instructions-preference";

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
    // showing one frame of the old value first.
    emitPreferenceChange();
    // Task 3 wires the background account write here.
  }, []);

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
