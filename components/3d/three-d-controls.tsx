"use client";

import type { ReactNode } from "react";
import { useDesign } from "@/components/design/design-store";
import { SliderRow } from "@/components/design/slider-row";
import { Live } from "@/components/rocker/live";
import { buttonVariants } from "@/components/ui/button";
import { useUnits } from "@/components/units-provider";
import {
  formatHardEdgeBlendsFrom,
  formatHardEdgeEndsAt,
  hardEdgeBlendsFromSlider,
  hardEdgeEndsAtSlider,
} from "@/lib/geometry/blank-reasons";
import { hardEdgeBlendsFrom, hardEdgeEndsAt } from "@/lib/geometry/rail-bands";
import type { ViewName } from "@/lib/geometry/view-3d";
import { cn } from "@/lib/utils";
import { THREE_D_COPY } from "./three-d-copy";

/**
 * The 3D screen's side panel (Phase 16, UI-SPEC §1): the title block, then the panel's sections each `gap-5`
 * apart — the same outer column every design screen's sidebar uses (`fin-controls.tsx`, `rocker-editor.tsx`).
 * The shell adds Back and Next and the site footer after it.
 *
 * Between the title and VIEW sits the `children` slot: the tail's two Hard Edge sliders bound to RAILS' own values
 * (D-30, `ThreeDHardEdge`), then the later plans' blocks (SHOW, 16-11). EXPORT (16-12) follows VIEW. Each block is a
 * `flex flex-col gap-2` opening with its ruled heading.
 */
export function ThreeDControls({
  children,
  onView,
  onReset,
  drawingUnavailable,
}: {
  children?: ReactNode;
  /** Turns the board to a preset view and re-frames it at 1x. */
  onView: (name: ViewName) => void;
  /** Back to the first view at 1x. */
  onReset: () => void;
  /** True while a canvas message shows instead of the board (UI-SPEC §8): the view buttons have nothing to turn. */
  drawingUnavailable: boolean;
}) {
  return (
    <div className="flex flex-col gap-5" data-three-d-controls>
      <div>
        <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">
          {THREE_D_COPY.title}
        </div>
        <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">{THREE_D_COPY.subtitle}</div>
      </div>
      {children}
      <ViewSection onView={onView} onReset={onReset} disabled={drawingUnavailable} />
    </div>
  );
}

/** A ruled section heading, the sidebars' own (`fin-controls.tsx`'s `SectionHeading`). */
export function ThreeDSectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1.5 border-b border-surf-line-faint pb-2 text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold">
      {children}
    </div>
  );
}

/**
 * HARD EDGE (D-30, the founder 2026-11-04: "I'd like that control on both the rails and the 3-D pages and they feed
 * each other. Changing one changes the other."): RAILS' own two tail rows — Hard Edge Blends From, then Hard Edge
 * Ends At — drawn exactly as RAILS draws them, reading and writing the very same two values on the board through
 * the very same readers, slider ranges and setters. There is one value, not two kept in step: move either here and
 * RAILS' row reads it, VOLUME's litres follow and the 3D board redraws; move it on RAILS and this row follows.
 *
 * While the tail's Hard Edge is off the two rows stay in their place, dimmed and out of reach (the `Live` wrapper:
 * `opacity-40` and `inert`), under one line of reason at full strength. They change the board, so a locked board
 * greys them as it greys RAILS' rows (`SliderRow` reads the lock itself) — unlike VIEW, which only changes what is
 * seen.
 */
export function ThreeDHardEdge() {
  const { effectiveRails, outline, setTailHardEdgeBlendsFrom, setTailHardEdgeEndsAt } = useDesign();
  const { system } = useUnits();
  const on = effectiveRails.tailHardEdge;
  const length = outline.length;
  const blendsFrom = hardEdgeBlendsFrom(effectiveRails, length);
  const endsAt = hardEdgeEndsAt(effectiveRails, length);
  const fromSlider = hardEdgeBlendsFromSlider(blendsFrom, endsAt, length, system);
  const endsSlider = hardEdgeEndsAtSlider(endsAt, blendsFrom, length, system);
  const fromText = formatHardEdgeBlendsFrom(blendsFrom, system);
  const endsText = formatHardEdgeEndsAt(endsAt, system);
  return (
    <div className="flex flex-col gap-2" data-three-d-hard-edge={on ? "on" : "off"}>
      <ThreeDSectionHeading>{THREE_D_COPY.hardEdgeHeading}</ThreeDSectionHeading>
      {!on && <div className="text-xs text-surf-ink-muted font-normal">{THREE_D_COPY.hardEdgeOffHint}</div>}
      <Live on={on}>
        <div className="flex flex-col gap-2">
          <SliderRow
            label={`${THREE_D_COPY.hardEdgeBlendsFrom} — ${fromText}`}
            value={fromSlider.value}
            min={fromSlider.min}
            max={fromSlider.max}
            step={fromSlider.step}
            onValueChange={(v) => setTailHardEdgeBlendsFrom(fromSlider.toMm(v))}
            sliderLabel={THREE_D_COPY.hardEdgeBlendsFromSlider}
            sliderValueText={THREE_D_COPY.hardEdgeFromTheTail(fromText)}
          />
          <SliderRow
            label={`${THREE_D_COPY.hardEdgeEndsAt} — ${endsText}`}
            value={endsSlider.value}
            min={endsSlider.min}
            max={endsSlider.max}
            step={endsSlider.step}
            onValueChange={(v) => setTailHardEdgeEndsAt(endsSlider.toMm(v))}
            sliderLabel={THREE_D_COPY.hardEdgeEndsAtSlider}
            sliderValueText={THREE_D_COPY.hardEdgeFromTheTail(endsText)}
          />
        </div>
      </Live>
    </div>
  );
}

/** Where each view button sits in the six-column grid (UI-SPEC §1): three to a row, then two, then Reset alone. */
const VIEW_SPAN: Record<ViewName, string> = {
  deck: "col-span-2",
  bottom: "col-span-2",
  side: "col-span-2",
  nose: "col-span-3",
  tail: "col-span-3",
};

/**
 * VIEW (UI-SPEC §1, §3): five preset views and Reset View. One-shot actions, never pressed toggles — once the shaper
 * drags, the board is no longer "in" a view, so none is ever marked as pressed. They only change what is seen, so a
 * locked board keeps them (`data-lock-exempt`, UI-SPEC §9); they are dimmed only while the canvas shows a message.
 */
function ViewSection({
  onView,
  onReset,
  disabled,
}: {
  onView: (name: ViewName) => void;
  onReset: () => void;
  disabled: boolean;
}) {
  const button = cn(buttonVariants({ variant: "outline" }), "w-full");
  const view = (name: ViewName) => ({
    type: "button" as const,
    disabled,
    onClick: () => onView(name),
    className: cn(button, VIEW_SPAN[name]),
    children: THREE_D_COPY.views[name],
  });
  return (
    <div className="flex flex-col gap-2">
      <ThreeDSectionHeading>{THREE_D_COPY.viewHeading}</ThreeDSectionHeading>
      <div role="group" aria-label={THREE_D_COPY.viewsGroup} className="grid grid-cols-6 gap-2">
        <button data-lock-exempt {...view("deck")} />
        <button data-lock-exempt {...view("bottom")} />
        <button data-lock-exempt {...view("side")} />
        <button data-lock-exempt {...view("nose")} />
        <button data-lock-exempt {...view("tail")} />
        <button type="button" data-lock-exempt disabled={disabled} onClick={onReset} className={cn(button, "col-span-6")}>
          {THREE_D_COPY.resetView}
        </button>
      </div>
    </div>
  );
}
