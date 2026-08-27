"use client";

/**
 * One saved-board card in `BoardRack` (D-12). `preset-card.tsx`'s shell reused byte for byte —
 * same whole-card `<button>`, same frame/window/well stack, same hover/focus treatment — so a
 * saved board reads with the same eye as a preset (UI-SPEC "populated" row). The thumbnail is a
 * live `OutlineViewer` fed by the snapshot's own outline, never a cached or pre-rendered image,
 * so the picture and the board it opens can never disagree (this plan's prohibition).
 */

import { OutlineViewer } from "@/components/outline/outline-viewer";
import { buildOutline } from "@/lib/geometry/outline";
import { summarizeDesign } from "@/lib/geometry/design";
import { formatFeetInches, formatInchesFraction } from "@/lib/geometry/units";
import type { DesignSnapshotFields } from "@/lib/models/design-snapshot";
import { cn } from "@/lib/utils";

export interface SavedModel {
  id: string;
  name: string;
  snapshot: DesignSnapshotFields;
  updatedAt: Date;
}

interface BoardRackCardProps {
  model: SavedModel;
  onSelect: (model: SavedModel) => void;
  className?: string;
}

export function BoardRackCard({ model, onSelect, className }: BoardRackCardProps) {
  const { outline, rails, volume } = model.snapshot;
  // Same live computation preset cards use — never a cached/pre-rendered image.
  const geometry = buildOutline(outline);
  const summary = summarizeDesign({ outline, rails, volume });
  const lastTouched = model.updatedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <button
      type="button"
      onClick={() => onSelect(model)}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-transparent bg-surf-canvas p-3 text-left outline-none transition-colors hover:border-surf-accent-ink hover:ring-2 hover:ring-surf-accent-ink focus-visible:border-surf-accent-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink",
        className,
      )}
    >
      <div className="rounded-lg border border-surf-line bg-surf-tab-active p-3">
        <div className="relative aspect-[340/620] w-full overflow-hidden rounded-lg border border-surf-line-faint bg-surf-panel">
          <OutlineViewer geometry={geometry} outline={outline} showConstruction={false} hideCallouts />
        </div>
      </div>
      <span className="block truncate text-[20px] leading-[1.2] font-semibold text-foreground">
        {model.name}
      </span>
      <span className="text-xs leading-[1.4] font-semibold text-surf-ink-muted">
        {formatFeetInches(summary.length)} · {formatInchesFraction(summary.widePointWidth)} ·{" "}
        {formatInchesFraction(summary.centerThickness)} · {summary.volumeLitres.toFixed(1)} L
      </span>
      <span className="text-xs leading-[1.4] text-surf-ink-muted">Last touched {lastTouched}</span>
      <span className="text-xs leading-[1.4] font-semibold tracking-architectural text-surf-accent-ink uppercase">
        Open This Board
      </span>
    </button>
  );
}
