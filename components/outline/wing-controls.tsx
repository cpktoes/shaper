"use client";

import { Button } from "@/components/ui/button";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import type { OutlineSpec } from "@/lib/geometry/board";
import { MAX_WINGS } from "@/lib/geometry/wings";
import { SectionHeading } from "./outline-controls";

/**
 * The WINGS tab's sidebar (quick 261014-wii, 2026-10-14, D3; sketch 014 B, "A, sidebar swaps").
 * While the WINGS tab is open the sidebar holds ONLY these controls, in the Template Builder's own
 * dress — the same title block, ruled section headings and slider rows as `outline-controls.tsx` —
 * and no board length or other template control.
 */
export interface WingControlsProps {
  outline: OutlineSpec;
  onChange: (patch: Partial<OutlineSpec>) => void;
  /** Adds the next wing — shared with the empty tab's card, so both add the same wing. */
  onAddWing: () => void;
}

export function WingControls({ outline, onChange, onAddWing }: WingControlsProps) {
  const locked = useControlsLocked();
  const wings = outline.wings ?? [];

  const removeWing = (index: number) => {
    onChange({ wings: wings.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">Wings</div>
        <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">
          Up to two, locked to the front fin or placed by hand
        </div>
      </div>

      {wings.map((_, index) => (
        <SectionHeading
          key={index}
          action={
            <button
              type="button"
              disabled={locked}
              onClick={() => removeWing(index)}
              className="cursor-pointer text-xs font-sans font-normal normal-case tracking-normal text-surf-ink-muted underline-offset-2 hover:text-surf-ink hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove
            </button>
          }
        >
          Wing {index + 1}
        </SectionHeading>
      ))}

      {wings.length < MAX_WINGS && (
        <Button variant="outline" className="w-full" disabled={locked} onClick={onAddWing}>
          {wings.length === 0 ? "+ Add a wing" : "+ Add wing 2"}
        </Button>
      )}
    </div>
  );
}
