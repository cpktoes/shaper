"use client";

/**
 * Holds the shaper's units preference (Imperial/Metric) and is the one hook every card and menu
 * row reads the chosen system through — no component converts a design value on its own
 * (CLAUDE.md Rule 2, D-16).
 *
 * Mirrors `components/theme-provider.tsx` almost exactly, with the one structural difference
 * D-12 requires: theme's `getServerSnapshot` is a fixed literal (`"system"`), because the
 * server genuinely cannot see localStorage and the CSS default is already correct with no
 * JavaScript at all. Units renders text, not CSS classes, so there is no equivalent
 * "correct by default" fallback — the server snapshot here has to be exactly what the server
 * actually rendered (`app/layout.tsx`'s `resolveUnitsHandoff()` result, threaded in as the
 * `handoff` prop), or a Metric shaper would see one frame of inches on every reload.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  UNITS_STORAGE_KEY,
  parseUnitsPreference,
  unitsCookieString,
  type UnitsHandoff,
} from "@/lib/units-preference";
import type { UnitsSystem } from "@/lib/geometry/units";

/* -- stored preference, as an external store ------------------------------------------- */

/** Subscribers for same-tab writes. The `storage` event only fires in *other* tabs. */
const storeListeners = new Set<() => void>();

function emitPreferenceChange() {
  for (const listener of storeListeners) listener();
}

function subscribeToStoredPreference(onStoreChange: () => void) {
  storeListeners.add(onStoreChange);
  // Free cross-tab sync: another tab picking Metric fires `storage` here, and this provider
  // re-renders without anything else being wired up.
  window.addEventListener("storage", onStoreChange);
  return () => {
    storeListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getStoredPreference(): UnitsSystem | null {
  try {
    return parseUnitsPreference(localStorage.getItem(UNITS_STORAGE_KEY));
  } catch {
    // Safari private mode and blocked-storage contexts throw on access.
    return null;
  }
}

/* -------------------------------------------------------------------------------------- */

export interface UnitsContextValue {
  /** What the shaper picked, or what the server resolved for an untouched browser. */
  system: UnitsSystem;
  setSystem: (next: UnitsSystem) => void;
}

const UnitsContext = createContext<UnitsContextValue | null>(null);

export function UnitsProvider({
  handoff,
  children,
}: {
  /** The server's resolution of this request — the account value (05-02) or the cookie (this
   * plan), reconciled by `decideUnitsHandoff`. `handoff.promoteToAccount` is carried through
   * here but has no writer yet: it is always null in this plan (the browser-only path never
   * promotes anything), and 05-02 adds the background account write that reads it. This is a
   * planned fill-in, not an oversight. */
  handoff: UnitsHandoff;
  children: ReactNode;
}) {
  const getSnapshot = useCallback(() => getStoredPreference() ?? handoff.system, [handoff.system]);
  const getServerSnapshot = useCallback(() => handoff.system, [handoff.system]);

  const system = useSyncExternalStore(subscribeToStoredPreference, getSnapshot, getServerSnapshot);

  const setSystem = useCallback((next: UnitsSystem) => {
    try {
      localStorage.setItem(UNITS_STORAGE_KEY, next);
      document.cookie = unitsCookieString(next);
    } catch {
      // Storage blocked — the choice still applies for this render (the emit below), it just
      // won't survive a reload. Better than refusing to switch.
    }
    // Emitted synchronously, on the click itself — a passive effect would run after paint,
    // showing one frame of the old system before the cards re-label (D-07's "watch the cards
    // behind the menu re-label as they click").
    emitPreferenceChange();
  }, []);

  // Adopts a signed-in shaper's account choice into the browser (D-09). Always null in this
  // plan (there is no account yet); 05-02 fills in `handoff.adoptIntoBrowser` without this
  // effect changing shape. Only writes when the browser doesn't already agree, so it never
  // stomps a value that's already correct.
  useEffect(() => {
    if (handoff.adoptIntoBrowser === null) return;
    if (getStoredPreference() === handoff.adoptIntoBrowser) return;
    try {
      localStorage.setItem(UNITS_STORAGE_KEY, handoff.adoptIntoBrowser);
      document.cookie = unitsCookieString(handoff.adoptIntoBrowser);
    } catch {
      // Storage blocked — this session still shows the account's choice via `handoff.system`
      // (the initial snapshot), it just won't be mirrored into the browser for next time.
    }
    emitPreferenceChange();
  }, [handoff.adoptIntoBrowser]);

  const value = useMemo(() => ({ system, setSystem }), [system, setSystem]);

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits(): UnitsContextValue {
  const ctx = useContext(UnitsContext);
  if (!ctx) {
    throw new Error("useUnits must be used within a UnitsProvider");
  }
  return ctx;
}
