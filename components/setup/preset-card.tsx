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
 * window box — now carries the same structural line `components/viewer/tabbed-panel.tsx` draws
 * around its panel, so the card as a whole mirrors that treatment: structural weight on the
 * outer box, receding weight on the inner one. See the comment above `return` for the full
 * stack.
 *
 * Between the name and the descriptor sits a dims line (`CardMetadataLine`, shared with the
 * rack cards) showing the same four numbers a shaper gets by clicking this preset — length,
 * width, thickness, litres — in the chosen units system (D-13, D-14). No hint, tip or arrow
 * points at the units chooser; the card just reads in whichever system is picked (D-15).
 */

import { useMemo } from "react";
import { OutlineViewer } from "@/components/outline/outline-viewer";
import { CardMetadataLine } from "@/components/setup/card-metadata-line";
import * as outlineGeometryLib from "@/lib/geometry/outline";
import type { BoardPreset } from "@/lib/geometry/presets";
import { presetSummary } from "@/lib/geometry/summary-line";
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
  // presetSummary runs the same summarizeDesign() pipeline over exactly the state applyPreset
  // writes into the store (D-13) — so the numbers on this card are the numbers a shaper gets
  // when they click it, never a second, divergent computation.
  const summary = useMemo(() => presetSummary(preset), [preset]);

  // The stack, outermost first: page (--surf-ground) -> sand frame (--surf-canvas, 12px band)
  // -> structural line (--surf-line, on the window box) -> window (--surf-tab-active, 12px
  // band) -> receding line (--surf-line-faint, on the well) -> panel (--surf-panel) -> board.
  //
  // --surf-ground, --surf-tab-active and --surf-panel hold the SAME value in all four themes;
  // --surf-canvas is the only distinct surface. So the two hairlines are doing ALL of the
  // separating work between page, window and board — this is the fact most likely to be
  // "fixed" by someone who has not measured it, and it is why neither line may be simplified
  // away.
  //
  // The two lines are different weights on purpose, not by oversight: it is the same pairing
  // components/viewer/tabbed-panel.tsx uses, for the reason that file's own docstring gives — a
  // panel boundary is structural, a content grouping should recede. The window box here plays
  // the panel's role and the well plays its inner content card's role.
  //
  // --surf-line and --surf-line-faint hold the SAME value in three of four themes
  // (Daylight/Chalk/Phosphor), so this pairing is only actually visible in Slate — where the
  // window box's edge now measures 3.39:1 against the sand frame and 3.70:1 against the window,
  // clearing the project's 3:1 non-text bar on both sides.
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
      <div className="rounded-lg border border-surf-line bg-surf-tab-active p-3">
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
      <CardMetadataLine summary={summary} />
      <span className="text-sm leading-[1.5] text-surf-ink-muted">{preset.descriptor}</span>
      <span className="text-xs leading-[1.4] font-semibold tracking-architectural text-surf-accent-ink uppercase">
        Start Shaping
      </span>
    </button>
  );
}
