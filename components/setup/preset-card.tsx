"use client";

/**
 * One board-type preset card on the setup screen (D-08). The thumbnail is drawn from the same
 * outline-geometry computation the click applies to the shared store — no second drawing
 * routine, no cached/pre-rendered image — so the picture and the applied board can never
 * disagree (this plan's prohibition). The whole card is a real `<button>` (not a div with a
 * click handler) so Tab/Enter/Space and focus work without hand-rolling them; the card's own
 * edge slot still lives on that button, so hover and focus states apply directly with no
 * parent/child style coupling — but at rest it now paints nothing. The sand band itself is
 * the card's boundary.
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

  // Four layers, top to bottom of the nesting, mirroring components/viewer/tabbed-panel.tsx
  // (the outer panel div and its inner content card, both 12px insets): a sand frame (this
  // button's fill), a white "tab-active" window (the div right below), a faint hairline
  // (the thumbnail well's own edge), and the board's own surface underneath that. The window
  // box carries no edge of its own on purpose — it is not a boundary, just a lit box behind
  // the drawing — so do not add one. The card's old outer line was removed on purpose too:
  // the founder's description names exactly one visible line on the whole card, and it is
  // the well's. In every theme, ground, tab-active and panel hold the SAME value, so that
  // one faint hairline is doing all the work of separating the window from the board's
  // surface — the single most surprising property of this markup, and the one most likely to
  // be "fixed" by someone who has not measured it. Do not restore the outer line.
  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-transparent bg-surf-canvas p-3 text-left outline-none transition-colors hover:border-surf-accent-ink hover:ring-2 hover:ring-surf-accent-ink focus-visible:border-surf-accent-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink",
        className,
      )}
    >
      <div className="rounded-lg bg-surf-tab-active p-3">
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
