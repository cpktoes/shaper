"use client";

/**
 * The one shared set of ticked rail-reference legend lines (D-01) — read and toggled by both the
 * RAILS screen's INSTRUCTIONS tab and the Summary's printed Rail Band Instructions sheet, so a
 * shaper never has two ticks that can disagree: untick a line on either screen and the other
 * screen, and the printed sheet, both follow.
 *
 * Session-only (D-02): a plain `useState`, nothing more — no storage, no cookie, no server action,
 * no database. It never enters `components/design/design-store.tsx`, never marks a board dirty and
 * is never attached to a saved board's own snapshot. That is the same reasoning
 * `components/print-instructions-provider.tsx` already records for its own preference ("this
 * describes how the shaper prints, not what the board is"), but deliberately WITHOUT that file's
 * localStorage/cookie/account machinery, which D-02 rules out. Mounted once, at
 * `app/design/layout.tsx`: App Router keeps a shared layout mounted across a client-side route
 * change, so the set survives a walk from RAILS to SUMMARY and back, and is simply gone — reset to
 * all-on — on a full reload.
 *
 * Seeded to every `GATEABLE_RAIL_REFERENCE_GROUPS` key, so every line starts drawn. That seed is
 * deliberately the same set the printed sheet used to hard-code before this change, so an
 * untouched session prints precisely the sheet it printed before this task.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { GATEABLE_RAIL_REFERENCE_GROUPS, type RailReferenceGroup } from "./rail-reference-paths";

export interface RailLegendContextValue {
  visibleGroups: Set<RailReferenceGroup>;
  toggleGroup: (key: RailReferenceGroup) => void;
}

const RailLegendContext = createContext<RailLegendContextValue | null>(null);

export function RailLegendProvider({ children }: { children: ReactNode }) {
  const [visibleGroups, setVisibleGroups] = useState<Set<RailReferenceGroup>>(
    () => new Set(GATEABLE_RAIL_REFERENCE_GROUPS),
  );

  function toggleGroup(key: RailReferenceGroup) {
    setVisibleGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const value = useMemo(() => ({ visibleGroups, toggleGroup }), [visibleGroups]);

  return <RailLegendContext.Provider value={value}>{children}</RailLegendContext.Provider>;
}

export function useRailLegend(): RailLegendContextValue {
  const ctx = useContext(RailLegendContext);
  if (!ctx) {
    throw new Error("useRailLegend must be used within a RailLegendProvider");
  }
  return ctx;
}
