"use client";

/**
 * Rendered only when `hasBoardInProgress` is true (the caller omits it entirely otherwise — no
 * empty/placeholder variant, per the UI-SPEC's E2/empty contract). Same visual weight as
 * `PresetCard`: a whole-card `<button>` that navigates to `/design/outline` without touching
 * board state.
 */

import { useDesign } from "@/components/design/design-store";
import { cn } from "@/lib/utils";

interface ContinueBoardCardProps {
  onContinue: () => void;
  className?: string;
}

export function ContinueBoardCard({ onContinue, className }: ContinueBoardCardProps) {
  const { boardName } = useDesign();
  const displayName = boardName.trim().length > 0 ? boardName : "Untitled Board";

  return (
    <button
      type="button"
      onClick={onContinue}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-transparent bg-surf-canvas p-4 text-left ring-1 ring-foreground/10 outline-none transition-colors hover:border-surf-accent-ink hover:ring-2 hover:ring-surf-accent-ink focus-visible:border-surf-accent-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink",
        className,
      )}
    >
      <span className="text-[20px] leading-[1.2] font-semibold text-foreground">Continue Current Board</span>
      <span className="block truncate text-sm leading-[1.5] text-surf-ink-muted">{displayName}</span>
      <span className="text-xs leading-[1.4] font-semibold tracking-architectural text-surf-accent-ink uppercase">
        Continue This Board
      </span>
    </button>
  );
}
