"use client";

/**
 * One board-type preset card on the setup screen (D-08). The thumbnail is drawn from the same
 * outline-geometry computation the click applies to the shared store — no second drawing
 * routine, no cached/pre-rendered image — so the picture and the applied board can never
 * disagree (this plan's prohibition). The whole card is a real `<button>` (not a div with a
 * click handler) so Tab/Enter/Space and focus work without hand-rolling them; the card's own
 * edge slot still lives on that button, so hover and focus states apply directly with no
 * parent/child style coupling — but at rest it still paints nothing on the outside. The sand
 * band is still the card's OUTER boundary, but its inner edge — where the sand meets the white
 * window box — now carries a faint hairline. See the comment above `return` for the full stack.
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

  // The stack, outermost first: page (--surf-ground) -> sand frame (--surf-canvas, 12px band)
  // -> faint line (new, below) -> window (--surf-tab-active, 12px band) -> faint line
  // (existing, on the well) -> panel (--surf-panel) -> board. Mirrors the two nested 12px-inset
  // boxes in components/viewer/tabbed-panel.tsx.
  //
  // --surf-ground, --surf-tab-active and --surf-panel hold the SAME value in all four themes;
  // --surf-canvas is the only distinct surface. So the two hairlines are doing ALL of the
  // separating work between page, window and board — this is the fact most likely to be
  // "fixed" by someone who has not measured it, and it is why neither line may be simplified
  // away.
  //
  // This new edge uses `--surf-line-faint`, not the `--surf-line` its design-screen counterpart
  // in tabbed-panel.tsx uses, because the founder asked for a faint line. The two tokens hold
  // the same value in three of four themes (Daylight/Chalk/Phosphor), so the choice only costs
  // anything in Slate: measured 1.43:1 against the sand frame and 1.56:1 against the window,
  // versus 3.39:1 and 3.70:1 if this were `--surf-line`.
  //
  // The card's own resting outer edge (the button's border-transparent slot) must stay
  // transparent: hover and focus-visible set colour only, not width, so restoring a resting
  // colour there would silently kill both interactive states.
  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-transparent bg-surf-canvas p-3 text-left outline-none transition-colors hover:border-surf-accent-ink hover:ring-2 hover:ring-surf-accent-ink focus-visible:border-surf-accent-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink",
        className,
      )}
    >
      <div className="rounded-lg border border-surf-line-faint bg-surf-tab-active p-3">
        <div className="relative aspect-[340/620] w-full overflow-hidden rounded-lg border border-surf-line-faint bg-surf-panel">
          <OutlineViewer
            geometry={geometry}
            outline={preset.outline}
            showConstruction={false}
            hideCallouts
          />
        </div>
      </div>
      <span className="text-[20px] leading-[1.2] font-semibold text-foreground">{preset.name}</span>
      <span className="text-sm leading-[1.5] text-surf-ink-muted">{preset.descriptor}</span>
      <span className="text-xs leading-[1.4] font-semibold tracking-architectural text-surf-accent-ink uppercase">
        Start Shaping
      </span>
    </button>
  );
}
