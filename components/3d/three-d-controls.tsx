"use client";

import type { ReactNode } from "react";
import { useDesign } from "@/components/design/design-store";
import { SliderRow } from "@/components/design/slider-row";
import { Checkbox } from "@/components/ui/checkbox";
import { Button, buttonVariants } from "@/components/ui/button";
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
 * Between the title and VIEW sits the `children` slot: the tail rail's two sliders bound to RAILS' own values
 * (D-30/D-32, `ThreeDTailRail`), then SHOW (`ThreeDShow`, 16-10: Fins; 16-11 adds Blank and Contour Stripes), directly
 * above VIEW as UI-SPEC §1 draws them. EXPORT (16-12) follows VIEW, last on the panel. Each block is a
 * `flex flex-col gap-2` opening with its ruled heading.
 */
export function ThreeDControls({
  children,
  onView,
  onReset,
  drawingUnavailable,
  exportState,
  onExport,
}: {
  children?: ReactNode;
  /** Turns the board to a preset view and re-frames it at 1x. */
  onView: (name: ViewName) => void;
  /** Back to the first view at 1x. */
  onReset: () => void;
  /** True while a canvas message shows instead of the board (UI-SPEC §8): the view buttons have nothing to turn. */
  drawingUnavailable: boolean;
  /** What the export's status line says (UI-SPEC §7): nothing yet, the done line, the failed line, or why it waits. */
  exportState: ExportState;
  /** Builds and downloads the zip, inside the tap. */
  onExport: () => void;
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
      <ExportSection state={exportState} onExport={onExport} />
    </div>
  );
}

/**
 * The export's state, as its status line reads it (UI-SPEC §7). There is no working state: the zip is built and
 * downloaded inside the tap, so the line goes straight from empty to the done line.
 */
export type ExportState =
  | { kind: "idle" }
  | { kind: "done"; fileName: string; sliceCount: number }
  | { kind: "failed" }
  | { kind: "cant-build" };

/** A ruled section heading, the sidebars' own (`fin-controls.tsx`'s `SectionHeading`). */
export function ThreeDSectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1.5 border-b border-surf-line-faint pb-2 text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold">
      {children}
    </div>
  );
}

/**
 * TAIL RAIL (D-30, the founder 2026-11-04: "I'd like that control on both the rails and the 3-D pages and they feed
 * each other. Changing one changes the other."; D-32: "Only the tail rail gets the users blend. The nose is a
 * default that always gets applied."): RAILS' own two tail rows — Tail Rail Blends From, then Tail Rail Ends At —
 * drawn exactly as RAILS draws them, reading and writing the very same two values on the board through the very
 * same readers, slider ranges and setters. There is one value, not two kept in step: move either here and RAILS'
 * row reads it, VOLUME's litres follow and the 3D board redraws; move it on RAILS and this row follows.
 *
 * Since D-32 the two rows bound the tail's whole rail character — Hard Edge, Family, Symmetrical, Single Tuck and
 * Sharp Bottom Tuck — so they are always live, Hard Edge ticked or not, with no reason line. They change the board,
 * so a locked board greys them as it greys RAILS' rows (`SliderRow` reads the lock itself) — unlike VIEW, which
 * only changes what is seen. The nose has no row here or anywhere: its blend is automatic.
 */
export function ThreeDTailRail() {
  const { effectiveRails, outline, setTailHardEdgeBlendsFrom, setTailHardEdgeEndsAt } = useDesign();
  const { system } = useUnits();
  const length = outline.length;
  const blendsFrom = hardEdgeBlendsFrom(effectiveRails, length);
  const endsAt = hardEdgeEndsAt(effectiveRails, length);
  const fromSlider = hardEdgeBlendsFromSlider(blendsFrom, endsAt, length, system);
  const endsSlider = hardEdgeEndsAtSlider(endsAt, blendsFrom, length, system);
  const fromText = formatHardEdgeBlendsFrom(blendsFrom, system);
  const endsText = formatHardEdgeEndsAt(endsAt, system);
  return (
    <div className="flex flex-col gap-2" data-three-d-tail-rail>
      <ThreeDSectionHeading>{THREE_D_COPY.tailRailHeading}</ThreeDSectionHeading>
      <SliderRow
        label={`${THREE_D_COPY.tailRailBlendsFrom} — ${fromText}`}
        value={fromSlider.value}
        min={fromSlider.min}
        max={fromSlider.max}
        step={fromSlider.step}
        onValueChange={(v) => setTailHardEdgeBlendsFrom(fromSlider.toMm(v))}
        sliderLabel={THREE_D_COPY.tailRailBlendsFromSlider}
        sliderValueText={THREE_D_COPY.tailRailFromTheTail(fromText)}
      />
      <SliderRow
        label={`${THREE_D_COPY.tailRailEndsAt} — ${endsText}`}
        value={endsSlider.value}
        min={endsSlider.min}
        max={endsSlider.max}
        step={endsSlider.step}
        onValueChange={(v) => setTailHardEdgeEndsAt(endsSlider.toMm(v))}
        sliderLabel={THREE_D_COPY.tailRailEndsAtSlider}
        sliderValueText={THREE_D_COPY.tailRailFromTheTail(endsText)}
      />
    </div>
  );
}

/**
 * SHOW (UI-SPEC §1, §6): what the picture includes. Fins (D-06) is on by default and hides the fins when unticked.
 * Blank (D-08) is off by default and shows the picked blank as a see-through ghost round the board; a hand-set board
 * has no blank, so its row is dimmed and can't be ticked, with the reason under it at full strength. Contour Stripes
 * (D-12) is off by default and swaps the foam's shading for bands of light, its hint always under it.
 *
 * A tick only changes what is seen — never the board, never saved, never undoable (D-17), never the files (D-16) —
 * so a locked board keeps it (marked lock-exempt, UI-SPEC §9), and the view stays exactly as it is. That is why this
 * section takes its ticks from the screen and reads nothing from the board itself. It is live while the drawing
 * loads (a tick made then applies when the board appears) and dimmed only while a canvas message shows.
 */
export function ThreeDShow({
  showFins,
  onShowFins,
  showBlank,
  onShowBlank,
  hasBlank,
  stripes,
  onStripes,
  disabled,
}: {
  showFins: boolean;
  onShowFins: (show: boolean) => void;
  showBlank: boolean;
  onShowBlank: (show: boolean) => void;
  /** Whether the board sits in a blank picked on ROCKER (`sideProfile.blank`); a hand-set board has none. */
  hasBlank: boolean;
  /** Contour Stripes (D-12): bands of light in place of the shading. */
  stripes: boolean;
  onStripes: (on: boolean) => void;
  /** True while a canvas message shows instead of the board (UI-SPEC §8): there is nothing to show. */
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <ThreeDSectionHeading>{THREE_D_COPY.showHeading}</ThreeDSectionHeading>
      <label className={TICK_ROW}>
        <Checkbox data-lock-exempt disabled={disabled} checked={showFins} onCheckedChange={(checked) => onShowFins(checked)} />
        {THREE_D_COPY.fins}
      </label>
      <div>
        <label className={cn(TICK_ROW, !hasBlank && "cursor-default opacity-40")}>
          <Checkbox
            data-lock-exempt
            disabled={disabled || !hasBlank}
            checked={hasBlank && showBlank}
            onCheckedChange={(checked) => onShowBlank(checked)}
          />
          {THREE_D_COPY.blank}
        </label>
        {!hasBlank && <div className={TICK_HINT}>{THREE_D_COPY.noBlankHint}</div>}
      </div>
      <div>
        <label className={TICK_ROW}>
          <Checkbox data-lock-exempt disabled={disabled} checked={stripes} onCheckedChange={(checked) => onStripes(checked)} />
          {THREE_D_COPY.contourStripes}
        </label>
        <div className={TICK_HINT}>{THREE_D_COPY.contourStripesHint}</div>
      </div>
    </div>
  );
}

/** A tick row: RAILS' own label row (UI-SPEC §1). */
const TICK_ROW = "flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal";
/** A hint under its tick row, indented to the label's words (16 box + 6 gap), at full strength. */
const TICK_HINT = "mt-1 pl-[22px] text-xs text-surf-ink-muted font-normal";

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

/**
 * EXPORT (UI-SPEC §1, §7; D-14, D-15 as amended by D-23): the screen's one accent-filled button, the note naming the
 * one program known to read the files, and a status line that is always in the page (empty until the first export)
 * so a screen reader hears the result.
 *
 * The button is dimmed only when the board can't be built — there is no surface to write. It stays live with no 3D
 * drawing (the files don't need it) and on a locked board (`data-lock-exempt`: exporting changes nothing, UI-SPEC §9).
 * The done line names the file in ink and counts the slices from the writer, never a typed number.
 */
function ExportSection({ state, onExport }: { state: ExportState; onExport: () => void }) {
  return (
    <div className="flex flex-col gap-2" data-three-d-export>
      <ThreeDSectionHeading>{THREE_D_COPY.exportHeading}</ThreeDSectionHeading>
      <div>
        <Button
          type="button"
          data-lock-exempt
          disabled={state.kind === "cant-build"}
          onClick={onExport}
          className="w-full border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85"
        >
          {THREE_D_COPY.exportButton}
        </Button>
        <div className="mt-2 text-xs text-surf-ink-muted font-normal">{THREE_D_COPY.exportNote}</div>
        <div
          role="status"
          aria-live="polite"
          data-three-d-export-status={state.kind}
          className={cn("mt-2 text-xs font-normal", state.kind === "failed" ? "text-surf-warning-ink" : "text-surf-ink-muted")}
        >
          <ExportStatus state={state} />
        </div>
      </div>
    </div>
  );
}

/** The status line's words for each state; the done line is the copy's own, with the file's name alone in ink. */
function ExportStatus({ state }: { state: ExportState }) {
  switch (state.kind) {
    case "idle":
      return null;
    case "failed":
      return THREE_D_COPY.exportFailed;
    case "cant-build":
      return THREE_D_COPY.exportNothingYet;
    case "done": {
      // The copy's own done line, split where the file's name goes, so the sentence is never retyped here.
      const marker = "\u0000";
      const [before, after] = THREE_D_COPY.exportDone(marker, state.sliceCount).split(marker);
      return (
        <>
          {before}
          <span className="text-surf-ink">{state.fileName}</span>
          {after}
        </>
      );
    }
  }
}
