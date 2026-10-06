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
 * A fresh order from the server — after a duplicate puts its copy beside the original (D-16), or a
 * rename or delete re-reads the page — replaces the local one: the local order is kept only while
 * the server's order is the one it was made against (`basis`), worked out while rendering (React's
 * "adjust state while rendering" pattern), never set from an effect.
 *
 * The saver is created inside an effect keyed on that basis and flushed, then disposed, in the
 * effect's cleanup, so React StrictMode's second mount on the dev server gets a fresh one and a
 * waiting order still goes out when the rack goes away. Leaving the page (`pagehide`) sends a
 * waiting order at once too.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { saveRackOrder } from "@/app/actions/rack-order";
import { createRackOrderSaver, type RackOrderSaver } from "@/lib/models/rack-order-saver";

/** The local order and the server order it was made against (JSON of that order). */
interface LocalOrder {
  basis: string;
  ids: readonly string[] | null;
}

function basisOf(order: readonly string[] | null): string {
  return JSON.stringify(order);
}

function orderFromBasis(basis: string): readonly string[] | null {
  const parsed: unknown = JSON.parse(basis);
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : null;
}

export interface RackOrderState {
  /** The order the rack shows: the shaper's newest move, else the order stored on their account
   * (null: never arranged, the automatic order). */
  order: readonly string[] | null;
  /** Shows `next` (the rack's whole saved order) at once and saves it in the background. */
  commit(next: readonly string[]): void;
  /** Sends a waiting order now — before Rename, Duplicate and Delete, which re-read the order. */
  flush(): void;
}

export function useRackOrder(serverOrder: readonly string[] | null, onSaveFailed: () => void): RackOrderState {
  const basis = basisOf(serverOrder);
  const [local, setLocal] = useState<LocalOrder>({ basis, ids: null });

  // A fresh server order replaces the local one (adjusted while rendering, no effect).
  let current = local;
  if (local.basis !== basis) {
    current = { basis, ids: null };
    setLocal(current);
  }

  const saverRef = useRef<RackOrderSaver | null>(null);
  const failedRef = useRef(onSaveFailed);
  useEffect(() => {
    failedRef.current = onSaveFailed;
  });

  useEffect(() => {
    const saver = createRackOrderSaver(orderFromBasis(basis), {
      save: (ids) => saveRackOrder(ids),
      setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimer: (handle) => window.clearTimeout(handle as number),
      onFailed: (revertTo) => {
        setLocal({ basis, ids: revertTo === null ? null : [...revertTo] });
        failedRef.current();
      },
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
  }, [basis]);

  const commit = useCallback(
    (next: readonly string[]) => {
      const ids = [...next];
      setLocal({ basis, ids });
      saverRef.current?.request(ids);
    },
    [basis],
  );

  const flush = useCallback(() => {
    saverRef.current?.flush();
  }, []);

  return { order: current.ids ?? serverOrder, commit, flush };
}
