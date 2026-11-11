"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { useDesign } from "@/components/design/design-store";
import { sectionOpeningStation, type BottomCutKey } from "@/lib/geometry/bottom-draw";
import type { Mm } from "@/lib/geometry/units";

/**
 * Where BOTTOM's section is taken (D-12, D-13; UI-SPEC §3.6): the wide point (where the page opens, sketch line 437),
 * the deepest station of the cut a shaper just picked, or of the channels just opened (it follows that cut's own
 * numbers as they change), or a station set by hand — the cutting line's drag or tap, or `Section at`.
 */
export type SectionStation = { follow: "wide" } | { follow: BottomCutKey } | { at: Mm };

/** The section's station as view state, held outside React's tree so a drag of the cutting line redraws only what
 * shows the station — the line, the section and `Section at` — never the panel or the screen around them. It lives as
 * long as BOTTOM is open and is never saved with the board or made an undo step (UI-SPEC §14). */
export interface SectionStationStore {
  get: () => SectionStation;
  set: (next: SectionStation) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createSectionStationStore(initial: SectionStation = { follow: "wide" }): SectionStationStore {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const SectionStationContext = createContext<SectionStationStore | null>(null);

function useStore(): SectionStationStore {
  const store = useContext(SectionStationContext);
  if (!store) throw new Error("BOTTOM's section station is read inside BottomEditor only");
  return store;
}

/** Moves the section: to a station by hand, or to follow a cut. Never re-renders the caller. */
export function useSetSectionStation(): (next: SectionStation) => void {
  return useStore().set;
}

/**
 * The station the section is taken at, from the tail, derived on every render from the board — never copied, so it can
 * never go stale: a followed cut that has gone flat (or channels set to None) falls back to the wide point.
 */
export function useSectionStation(): Mm {
  const store = useStore();
  const raw = useSyncExternalStore(store.subscribe, store.get, store.get);
  const { resolvedBottom, bottomBoard } = useDesign();
  if ("at" in raw) return raw.at;
  const followed = raw.follow;
  if (followed === "channels") return resolvedBottom.channels.count > 0 ? resolvedBottom.channels.deepest : sectionOpeningStation(bottomBoard);
  if (followed !== "wide" && resolvedBottom[followed].kind !== "flat") return resolvedBottom[followed].deepest;
  return sectionOpeningStation(bottomBoard);
}
