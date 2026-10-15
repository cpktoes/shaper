"use client";

import { buttonVariants } from "@/components/ui/button";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import type { OutlineSpec } from "@/lib/geometry/board";
import { cn } from "@/lib/utils";

/**
 * The WINGS tab's content on the TEMPLATE page (quick 261014-wii, 2026-10-14, D3, P9). Lives in its
 * own file so `outline-editor.tsx` keeps exactly the toolbar-button count
 * `components/viewer/toolbar-button.test.ts` pins.
 */
export interface WingsPanelProps {
  outline: OutlineSpec;
  onAddWing: () => void;
}

export function WingsPanel({ outline, onAddWing }: WingsPanelProps) {
  const locked = useControlsLocked();
  const wingCount = outline.wings?.length ?? 0;

  return (
    <div className="relative flex min-h-0 flex-1">
      {wingCount === 0 && (
        // The empty tab (sketch 014's own card): a centred card over the drawing, with the same
        // "+ Add a wing" the sidebar carries, in the Next button's accent fill.
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div
            data-wings-empty
            className="max-w-xs rounded-lg border border-surf-line bg-surf-panel p-5 text-center shadow-sm"
          >
            <div className="text-sm font-display font-extrabold uppercase tracking-architectural text-surf-ink">
              No wings yet
            </div>
            <p className="mt-2 text-sm text-surf-ink-muted">
              A wing is a step in the outline near the fins. Add one, then dial it in against the fin placement.
            </p>
            <button
              type="button"
              disabled={locked}
              onClick={onAddWing}
              className={cn(
                buttonVariants(),
                "mt-4 w-full border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85",
              )}
            >
              + Add a wing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
