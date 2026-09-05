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
 *
 * The account side also means the client's own snapshot can no longer just prefer localStorage
 * unconditionally (WR-02): a shaper who picked Metric on one device and signs in on a browser
 * that still has an older `imperial` cached from before has a real disagreement to reconcile,
 * not just an absent value to fall back past. Until the adoption effect below has actually run
 * (or there was nothing to adopt), the client snapshot defers to the server's resolved system —
 * see the `reconciledRef` comment further down.
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
  createUnitsWriteQueue,
  parseUnitsPreference,
  unitsCookieString,
  type UnitsHandoff,
  type UnitsWriteQueue,
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
  // WR-02: the server-resolved system is authoritative until the browser has actually been
  // reconciled to it. `getSnapshot` used to prefer localStorage unconditionally — correct when
  // there was nothing to reconcile, but wrong the moment `handoff.adoptIntoBrowser` names an
  // account value: React re-invokes `getSnapshot` in a passive effect right after mount, and if
  // localStorage still held a stale value from another device or an earlier signed-out session,
  // that mount-time re-check would force a render to the WRONG system for one frame, before the
  // adoption effect below corrects storage and forces a second render back to the right one — a
  // metric -> imperial -> metric flash on exactly the sign-in-on-a-new-device path this feature
  // exists to get right (the scenario D-12 promises never happens).
  //
  // `reconciledRef` starts `true` when there is nothing to reconcile (signed out, or no account
  // value — today's original behaviour, unchanged) and `false` whenever an account value is
  // about to be adopted. It flips to `true` in exactly two places: at the end of the adoption
  // effect below (including its early-return branch where storage already agreed), and inside
  // `setSystem` (a click always wins immediately, reconciled or not). `getSnapshot` stays pure
  // apart from reading this ref and localStorage — it never flips the ref itself.
  const reconciledRef = useRef(handoff.adoptIntoBrowser === null);

  const getSnapshot = useCallback(() => {
    if (!reconciledRef.current) return handoff.system;
    return getStoredPreference() ?? handoff.system;
  }, [handoff.system]);
  const getServerSnapshot = useCallback(() => handoff.system, [handoff.system]);

  const system = useSyncExternalStore(subscribeToStoredPreference, getSnapshot, getServerSnapshot);

  /* -- the background account write (D-11) --------------------------------------------- */
  // The actual sequencing policy — "at most one save in flight, the last pick always lands
  // last" — lives in lib/units-preference.ts's `createUnitsWriteQueue`, pure and unit-tested the
  // same way lib/models/autosave.ts keeps its decisions pure while the component only wires a
  // timer to them (WR-01). This provider only supplies the real Server Action and real
  // setTimeout/clearTimeout, and forwards every pick to `request`.
  const writeQueueRef = useRef<UnitsWriteQueue | null>(null);
  function getWriteQueue(): UnitsWriteQueue {
    if (writeQueueRef.current === null) {
      writeQueueRef.current = createUnitsWriteQueue({
        save: saveUnitsPreference,
        setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
        clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      });
    }
    return writeQueueRef.current;
  }

  const scheduleAccountWrite = useCallback((next: UnitsSystem) => {
    getWriteQueue().request(next);
  }, []);

  // Cancels any in-flight retry timer on unmount — nothing should keep firing after the provider
  // is gone.
  useEffect(() => {
    return () => {
      writeQueueRef.current?.dispose();
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
    // A click always wins immediately, reconciled or not — `getSnapshot` must reflect it on the
    // very next read, so this flips before the emit below (WR-02).
    reconciledRef.current = true;
    // Emitted synchronously, on the click itself — a passive effect would run after paint,
    // showing one frame of the old system before the cards re-label (D-07's "watch the cards
    // behind the menu re-label as they click"). The screen has already switched by the time the
    // account write below even starts (D-11) — the write can never block, delay or revert it.
    emitPreferenceChange();
    scheduleAccountWrite(next);
  }, [scheduleAccountWrite]);

  // Adopts a signed-in shaper's account choice into the browser (D-09). Only writes when the
  // browser doesn't already agree, so it never stomps a value that's already correct. Either way
  // this effect ends by flipping `reconciledRef` to `true` and emitting (WR-02) — from this point
  // on `getSnapshot` is safe to read localStorage again, because it now agrees with `handoff`.
  useEffect(() => {
    if (handoff.adoptIntoBrowser === null) return; // nothing to reconcile — reconciledRef started true
    if (getStoredPreference() === handoff.adoptIntoBrowser) {
      reconciledRef.current = true;
      emitPreferenceChange();
      return;
    }
    try {
      localStorage.setItem(UNITS_STORAGE_KEY, handoff.adoptIntoBrowser);
      document.cookie = unitsCookieString(handoff.adoptIntoBrowser);
    } catch {
      // Storage blocked — this session still shows the account's choice via `handoff.system`
      // (the initial snapshot), it just won't be mirrored into the browser for next time.
    }
    reconciledRef.current = true;
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
