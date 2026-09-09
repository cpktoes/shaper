"use client";

/**
 * D-03's disclosure header: on a phone, the sliders that only repeat what a drag point on
 * TEMPLATE or ROCKER already sets fold behind one closed row at the bottom of the controls.
 * Folding is not hiding — every one of them is one tap away, so PHON-01 holds.
 *
 * This is the header row only. The folded sliders themselves stay exactly where they already are
 * in the controls scroller's DOM — reordered to the end and shown/hidden purely with CSS `order`
 * and a `group-data-[fine-adjust=…]` selector on the caller's own column (see
 * `outline-controls.tsx`), never rendered twice and never moved in the DOM. That is what keeps a
 * folded `SliderRow` the SAME instance whether the group is open or closed, so nothing about it —
 * focus, drag state, an in-progress edit — is lost when a shaper opens the group.
 *
 * `hidden max-shell:flex` here, not in the caller: this row never exists on a desktop screen at
 * any width, so its own visibility is fixed, while `max-shell:order-50` (which column position it
 * takes among its phone siblings) is the caller's to set via `className`.
 */

import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FineAdjustDisclosureProps {
  /** Whether the folded rows beneath this header are currently shown. */
  open: boolean;
  onToggle: () => void;
  className?: string;
}

export function FineAdjustDisclosure({ open, onToggle, className }: FineAdjustDisclosureProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        // 44px at rest needs no coarse: override — it already meets the touch minimum.
        "focus-ring-accent hidden max-shell:flex min-h-11 w-full items-center justify-between rounded-md border border-surf-line-faint bg-surf-well px-4",
        className,
      )}
    >
      {/* Label role: 12px, bold, architecturally tracked uppercase — the nav's own heading
          treatment, so this reads as a section header rather than another slider. */}
      <span className="text-xs font-bold tracking-architectural text-surf-ink uppercase">
        Fine adjust
      </span>
      {/* Neutral ink and neutral chevron — no accent. Folding a slider group is a layout
          convenience, not a call to action. */}
      <ChevronDownIcon
        aria-hidden
        className={cn(
          "size-4 text-surf-ink-muted transition-transform duration-150",
          open && "rotate-180",
        )}
      />
    </button>
  );
}
