"use client";

/**
 * The nine rail-reference legend ticks (RAIL-05, D-01) — one `<label>` per `RAIL_REFERENCE_LEGEND`
 * entry, generated rather than hand-listed, so the RAILS tab and the Summary render the identical
 * markup from one source and can never drift into two different label lists. Reads and writes the
 * shared `useRailLegend()` set, so a tick here changes both the on-screen figure it sits beside and
 * the printed Rail Band Instructions sheet.
 *
 * Text size is left to the caller's `className` — the RAILS tab and the Summary want different
 * sizes for this block — everything else is the label markup exactly as `RailInstructions` used to
 * draw it locally, including the `coarse:min-h-11` touch-target rule.
 */

import { Checkbox } from "@/components/ui/checkbox";
import { useRailLegend } from "./rail-legend-provider";
import { RAIL_REFERENCE_LEGEND } from "./rail-plan-side-figure";

export function RailLegendTicks({ className }: { className?: string }) {
  const { visibleGroups, toggleGroup } = useRailLegend();

  return (
    <div className={className}>
      {RAIL_REFERENCE_LEGEND.map((entry) => (
        <label
          key={entry.key}
          className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 print:min-h-0 text-surf-ink-muted"
        >
          <Checkbox checked={visibleGroups.has(entry.key)} onCheckedChange={() => toggleGroup(entry.key)} />
          <span
            className="inline-block h-[9px] w-[9px] flex-shrink-0 rounded-full"
            style={{ background: entry.color }}
          />
          {entry.label}
        </label>
      ))}
    </div>
  );
}
