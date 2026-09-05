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
 *
 * 05-02 fills in the account side: a fire-and-forget write on every pick (with a bounded quiet
 * retry, mirroring `lib/models/autosave.ts`'s "a rejected write can never claim success"
 * discipline), plus a one-time promotion of an explicit browser pick into an empty account.
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
import { saveUnitsPreference } from "@/app/actions/units";
import {
  UNITS_STORAGE_KEY,
  nextUnitsWriteRetryDelayMs,
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

  /* -- the background account write (D-11) --------------------------------------------- */
  // Holds the pending retry's timeout handle and how many attempts have already failed, so a
  // newer pick can cancel a stale retry in flight and start its own attempt count at zero — a
  // rejected write for an OLDER system must never land after a NEWER one already succeeded.
  const pendingWriteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeAttemptRef = useRef(0);

  const scheduleAccountWrite = useCallback((next: UnitsSystem) => {
    if (pendingWriteTimeoutRef.current !== null) {
      clearTimeout(pendingWriteTimeoutRef.current);
      pendingWriteTimeoutRef.current = null;
    }
    writeAttemptRef.current = 0;

    const attemptWrite = () => {
      saveUnitsPreference(next).catch(() => {
        // A rejected write can never be reported as success or cause the on-screen system to
        // change (the `nextStatusAfter` discipline from lib/models/autosave.ts) — it only ever
        // schedules a quiet retry, or gives up silently once the ladder is exhausted. No toast,
        // no banner, no reverted check (D-11).
        const delay = nextUnitsWriteRetryDelayMs(writeAttemptRef.current);
        writeAttemptRef.current += 1;
        if (delay === null) return;
        pendingWriteTimeoutRef.current = setTimeout(attemptWrite, delay);
      });
    };
    attemptWrite();
  }, []);

  // Clears any in-flight retry on unmount — nothing should keep firing after the provider is
  // gone.
  useEffect(() => {
    return () => {
      if (pendingWriteTimeoutRef.current !== null) {
        clearTimeout(pendingWriteTimeoutRef.current);
      }
    };
  }, []);

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
    // behind the menu re-label as they click"). The screen has already switched by the time the
    // account write below even starts (D-11) — the write can never block, delay or revert it.
    emitPreferenceChange();
    scheduleAccountWrite(next);
  }, [scheduleAccountWrite]);

  // Adopts a signed-in shaper's account choice into the browser (D-09). Only writes when the
  // browser doesn't already agree, so it never stomps a value that's already correct.
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

  // Promotes a browser's explicit pick into an account that has none (UNIT-04) — an account
  // that already had a value never reaches this branch (`handoff.promoteToAccount` is only ever
  // non-null when the account was empty; see decideUnitsHandoff). Fires once on mount, guarded
  // by a ref so a re-render can't fire it twice, through the same write-and-retry helper a click
  // uses (fire-and-forget, D-11).
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
