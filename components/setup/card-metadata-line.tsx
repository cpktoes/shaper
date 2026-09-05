"use client";

/**
 * The one place a board's four numbers — length, width, thickness, litres — become the line a
 * shaper reads on a card. Shared by the saved-board rack cards, the in-progress rack card, and
 * the preset cards (`components/setup/preset-card.tsx`, from 05-03 onward), so those three can
 * never disagree about how a board's size is written.
 *
 * The string itself is composed in `lib/geometry/summary-line.ts` — this component owns only the
 * typography, and reads the shaper's chosen system via `useUnits()` (CLAUDE.md Rule 2, D-16: no
 * component converts a design value on its own).
 */

import { useUnits } from "@/components/units-provider";
import type { DesignSummary } from "@/lib/geometry/design";
import { formatSummaryLine } from "@/lib/geometry/summary-line";

export function CardMetadataLine({ summary }: { summary: DesignSummary }) {
  const { system } = useUnits();
  return (
    <span className="text-xs leading-[1.4] font-semibold text-surf-ink-muted">
      {formatSummaryLine(summary, system)}
    </span>
  );
}
