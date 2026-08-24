"use client";

/**
 * One board-type preset card on the setup screen (D-08). The thumbnail is drawn from the same
 * outline-geometry computation the click applies to the shared store — no second drawing
 * routine, no cached/pre-rendered image — so the picture and the applied board can never
 * disagree (this plan's prohibition). The whole card is a real `<button>` (not a div with a
 * click handler) so Tab/Enter/Space and focus work without hand-rolling them; the card's own
 * border/ring lives on that button, so hover and focus states apply directly with no
 * parent/child style coupling.
 */

import { OutlineViewer } from "@/components/outline/outline-viewer";
import * as outlineGeometryLib from "@/lib/geometry/outline";
import type { BoardPreset } from "@/lib/geometry/presets";
import { cn } from "@/lib/utils";

interface PresetCardProps {
  preset: BoardPreset;
  onSelect: (preset: BoardPreset) => void;
  className?: string;
}

export function PresetCard({ preset, onSelect, className }: PresetCardProps) {
  // The same pure outline-geometry computation the click below applies to the shared store —
  // see this plan's prohibition against a second drawing routine or a cached/pre-rendered image.
  const geometry = outlineGeometryLib.buildOutline(preset.outline);

  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-transparent bg-card p-4 text-left ring-1 ring-foreground/10 outline-none transition-colors hover:border-surf-accent-cyan-ink hover:ring-2 hover:ring-surf-accent-cyan-ink focus-visible:border-surf-accent-cyan-ink focus-visible:ring-2 focus-visible:ring-surf-accent-cyan-ink",
        className,
      )}
    >
      <div className="relative aspect-[340/620] w-full overflow-hidden rounded-lg bg-outline-page-bg">
        <OutlineViewer
          geometry={geometry}
          outline={preset.outline}
          showConstruction={false}
          hideCallouts
        />
      </div>
      <span className="text-[20px] leading-[1.2] font-semibold text-foreground">{preset.name}</span>
      <span className="text-sm leading-[1.5] text-surf-muted">{preset.descriptor}</span>
      <span className="text-xs leading-[1.4] font-semibold tracking-architectural text-surf-accent-cyan-ink uppercase">
        Start Shaping
      </span>
    </button>
  );
}
