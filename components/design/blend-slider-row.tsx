"use client";

import { BLEND_PINNED_HINT, type BlendTip } from "@/components/design/blend-pinned-copy";
import { SliderRow } from "@/components/design/slider-row";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { type MeasureSliderView, sliderTrack } from "@/lib/geometry/measure-display";
import type { Mm } from "@/lib/geometry/units";

export interface BlendSliderRowProps {
  /** Which of the pair this row is: Blends From rests at the bottom of its range when pinned, Ends At at the top. */
  which: keyof typeof BLEND_PINNED_HINT;
  tip: BlendTip;
  label: string;
  view: MeasureSliderView;
  onChange?: (value: Mm) => void;
  sliderLabel: string;
  sliderValueText: string;
}

/**
 * One row of a tip rail's blend pair — Blends From or Ends At — on RAILS and on the 3D page, the nose's and the
 * tail's alike. While the slider has room it is the plain `SliderRow` it always was. With nowhere to go it is greyed,
 * its handle drawn at the one place it can sit (`sliderTrack`), and a line under it says which slider to move — at
 * full strength, in a line of its own outside the greyed row. A locked board greys every row for its own reason and
 * takes no line.
 */
export function BlendSliderRow({ which, tip, label, view, onChange, sliderLabel, sliderValueText }: BlendSliderRowProps) {
  const locked = useControlsLocked();
  const track = sliderTrack(view, which === "blendsFrom" ? "start" : "end");
  const row = (
    <SliderRow
      label={label}
      value={track.value}
      min={track.min}
      max={track.max}
      step={view.step}
      disabled={track.pinned || undefined}
      onValueChange={(v) => {
        if (!track.pinned) onChange?.(view.toMm(v));
      }}
      sliderLabel={sliderLabel}
      sliderValueText={sliderValueText}
    />
  );
  if (!track.pinned || locked) return row;
  return (
    <div data-blend-pinned={which}>
      {row}
      <p data-blend-pinned-hint className="mt-2 text-xs text-surf-ink-muted">
        {BLEND_PINNED_HINT[which](tip)}
      </p>
    </div>
  );
}
