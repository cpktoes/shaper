"use client";

/**
 * The order the shaper sets on the Board Rack, shown at once and saved in the background (Phase 15,
 * R8, D-03).
 *
 * A move changes the rack straight away: the new order is kept here, on the page, and handed to
 * `createRackOrderSaver` (lib/models/rack-order-saver.ts), which sends the rack's whole saved order
 * to the shaper's account through the `saveRackOrder` Server Action — a burst of moves saves once.
 * The first move fixes the order from then on (the stored list replaces the automatic newest-first
 * order). A failed save puts the order back to the last one that did save (or to the automatic
 * order, when nothing ever did) and the rack says so.
 *
 * Every save refreshes the page (code review CR-01), so Back never brings back an order from before
 * a move. Each refresh hands this hook the stored order again, and which order the rack then shows
 * is one pure rule (`rackOrderViewOnArrival`, lib/models/rack-order-sync.ts): while the saver has a
 * move waiting or on its way the rack keeps what it shows — an older save's refresh never snaps a
 * later move back — and with the saver idle it takes the stored order (a copy placed beside its
 * original after a Duplicate, a rename or delete re-reading the page, another device). Worked out
 * while rendering (React's "adjust state while rendering" pattern), never set from an effect.
 *
 * The saver is created inside an effect keyed on the stored order it starts from (which only changes
 * while it is idle) and flushed, then disposed, in the effect's cleanup, so React StrictMode's
 * second mount on the dev server gets a fresh one and a waiting order still goes out when the rack
 * goes away — even behind a save already on its way. Leaving the page (`pagehide`) sends a waiting
 * order at once too.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { saveRackOrder } from "@/app/actions/rack-order";
import { createRackOrderSaver, type RackOrderSaver } from "@/lib/models/rack-order-saver";
import {
  basisOf,
  orderFromBasis,
  rackOrderViewAfterFailure,
  rackOrderViewAfterMove,
  rackOrderViewFrom,
  rackOrderViewOnArrival,
  type RackOrderView,
} from "@/lib/models/rack-order-sync";

export interface RackOrderState {
  /** The order the rack shows: the shaper's newest move, else the order stored on their account
   * (null: never arranged, the automatic order). */
  order: readonly string[] | null;
  /** Shows `next` (the rack's whole saved order) at once and saves it in the background. */
  commit(next: readonly string[]): void;
  /** Sends a waiting order now and resolves once every order has landed (or failed) — awaited
   * before Rename, Duplicate and Delete, which re-read the order from the account (WR-01). */
  flushAndSettle(): Promise<void>;
}

export function useRackOrder(serverOrder: readonly string[] | null, onSaveFailed: () => void): RackOrderState {
  const incoming = basisOf(serverOrder);
  const [view, setView] = useState<RackOrderView>(() => rackOrderViewFrom(incoming));
  /** True while the saver has an order waiting or on its way (its `onPendingChange`). */
  const [saverBusy, setSaverBusy] = useState(false);

  // A stored order arriving from the server: kept out while a save is waiting or travelling, taken
  // when the saver is idle (adjusted while rendering, no effect).
  let current = view;
  if (view.seen !== incoming) {
    current = rackOrderViewOnArrival(view, incoming, !saverBusy);
    setView(current);
  }
  const base = current.base;

  const saverRef = useRef<RackOrderSaver | null>(null);
  const failedRef = useRef(onSaveFailed);
  useEffect(() => {
    failedRef.current = onSaveFailed;
  });

  useEffect(() => {
    const saver = createRackOrderSaver(orderFromBasis(base), {
      save: (ids) => saveRackOrder(ids),
      setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimer: (handle) => window.clearTimeout(handle as number),
      onFailed: (revertTo) => {
        setView((prev) => rackOrderViewAfterFailure(prev, revertTo));
        failedRef.current();
      },
      onPendingChange: setSaverBusy,
    });
    saverRef.current = saver;
    const onPageHide = () => saver.flush();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      saver.flush();
      saver.dispose();
      if (saverRef.current === saver) saverRef.current = null;
    };
  }, [base]);

  const commit = useCallback((next: readonly string[]) => {
    const ids = [...next];
    setView((prev) => rackOrderViewAfterMove(prev, ids));
    saverRef.current?.request(ids);
  }, []);

  const flushAndSettle = useCallback(async () => {
    const saver = saverRef.current;
    if (!saver) return;
    saver.flush();
    await saver.settled();
  }, []);

  // With no order of its own, the rack shows the server's — the prop itself, so its identity only
  // changes when the server's order does.
  return { order: current.local ? current.local.ids : serverOrder, commit, flushAndSettle };
}
