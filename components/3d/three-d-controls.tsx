"use client";

import { useState, type ReactNode, type RefObject } from "react";
import { useDesign } from "@/components/design/design-store";
import { SliderRow } from "@/components/design/slider-row";
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
 * The panel reads the title, then VIEW with the four sliders under it, then Rail Blend Controls, folded, then EXPORT (the
 * founder's order, 2026-11-05, on every device). The `children` slot holds the sliders and the fold (`three-d-rack-controls.tsx`,
 * `ThreeDRailBlend`). Each block is a `flex flex-col gap-2` opening with its ruled heading. What the picture includes (Fins,
 * Blank, Contour Stripes, Wire View and the Room) lives in the canvas's corner, as icons beside Wide view (D-35,
 * `three-d-show-buttons.tsx`).
 */
export function ThreeDControls({
  children,
  onView,
  onReset,
  modeSwitch,
  sideWaits,
  drawingUnavailable,
  exportState,
  exportSwallowNote,
  exportChannelsNote,
  exportButtonRef,
  onExport,
}: {
  children?: ReactNode;
  /** One of the five buttons: what each does depends on the mode (the founder, 2026-11-05). */
  onView: (name: ViewName) => void;
  /** Back to the first view at 1x. */
  onReset: () => void;
  /** What a drag does (D-43), first in VIEW. */
  modeSwitch: ReactNode;
  /** On Turn the Board there is one view, so Side is dimmed with its reason. */
  sideWaits: boolean;
  /** True while a canvas message shows instead of the board (UI-SPEC §8): the view buttons have nothing to turn. */
  drawingUnavailable: boolean;
  /** What the export's status line says (UI-SPEC §7): nothing yet, the done line, the failed line, or why it waits. */
  exportState: ExportState;
  /** True on a swallow-tail board: the file writes the tail square, and a line under the export button says so. */
  exportSwallowNote: boolean;
  /** True on a board with channels: the file leaves them out, and a line under the export button says so. */
  exportChannelsNote: boolean;
  /** The Export button, so focus goes back to it when the preview dialog it opens is closed (quick 261112-dbi). */
  exportButtonRef?: RefObject<HTMLButtonElement | null>;
  /** Makes the board file and opens its preview; nothing is downloaded until the preview's Save. */
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
      <ViewSection
        onView={onView}
        onReset={onReset}
        modeSwitch={modeSwitch}
        sideWaits={sideWaits}
        disabled={drawingUnavailable}
      />
      {children}
      <ExportSection
        state={exportState}
        swallowNote={exportSwallowNote}
        channelsNote={exportChannelsNote}
        buttonRef={exportButtonRef}
        onExport={onExport}
      />
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
 * The tail rail's rows (D-30, the founder 2026-11-04: "I'd like that control on both the rails and the 3-D pages and they feed
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
 * Rail Blend Controls (the founder: "The tail rail section should be under a Rail Blend Controls collapsted by default
 * section."): RAILS' Advanced fold's idiom, a ruled heading with its ▾/▸ arrow. Folded until pressed, and open only while
 * the screen is: nothing here is saved. The fold itself only changes what shows, so a locked board keeps it; the rows
 * inside change the board, so a locked board greys those.
 */
export function ThreeDRailBlend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2" data-three-d-rail-blend>
      <button
        type="button"
        data-lock-exempt
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="focus-ring-accent mt-1.5 flex w-full items-center justify-between border-b border-surf-line-faint pb-2 text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold coarse:min-h-11"
      >
        <span>{THREE_D_COPY.railBlendHeading}</span>
        <span aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <>
          <div className="text-xs text-surf-ink-muted font-normal">{THREE_D_COPY.railBlendNote}</div>
          <ThreeDTailRail />
        </>
      )}
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
 * VIEW: what a drag does, the five buttons and Reset View. On Turn the Board there is one view and only the board moves:
 * Deck and Bottom set that face up, Nose and Tail turn the board so that end is nearer you, and Side has nothing to do, so
 * it is dimmed with its reason in its tooltip, as Blank is on a hand-set board (`aria-disabled`, or the tooltip would never
 * show). On Walk Around they move you. The buttons are one-shot actions, never pressed toggles. They only change what is
 * seen, so a locked board keeps them (`data-lock-exempt`, UI-SPEC §9); they are dimmed only while the canvas shows a message.
 */
function ViewSection({
  onView,
  onReset,
  modeSwitch,
  sideWaits,
  disabled,
}: {
  onView: (name: ViewName) => void;
  onReset: () => void;
  modeSwitch: ReactNode;
  sideWaits: boolean;
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
      {modeSwitch}
      <div role="group" aria-label={THREE_D_COPY.viewsGroup} className="grid grid-cols-6 gap-2">
        <button data-lock-exempt {...view("deck")} />
        <button data-lock-exempt {...view("bottom")} />
        <button
          data-lock-exempt
          {...view("side")}
          title={sideWaits ? THREE_D_COPY.sideNeedsWalk : undefined}
          aria-disabled={sideWaits ? true : undefined}
          className={cn(view("side").className, sideWaits && "cursor-default opacity-50")}
        />
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
function ExportSection({
  state,
  swallowNote,
  channelsNote,
  buttonRef,
  onExport,
}: {
  state: ExportState;
  swallowNote: boolean;
  channelsNote: boolean;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col gap-2" data-three-d-export>
      <ThreeDSectionHeading>{THREE_D_COPY.exportHeading}</ThreeDSectionHeading>
      <div>
        <Button
          ref={buttonRef}
          type="button"
          data-lock-exempt
          disabled={state.kind === "cant-build"}
          onClick={onExport}
          className="w-full border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85"
        >
          {THREE_D_COPY.exportButton}
        </Button>
        <div className="mt-2 text-xs text-surf-ink-muted font-normal">{THREE_D_COPY.exportNote}</div>
        {swallowNote ? (
          <div className="mt-2 text-xs text-surf-ink-muted font-normal" data-three-d-export-swallow>
            {THREE_D_COPY.exportSwallowNote}
          </div>
        ) : null}
        {channelsNote ? (
          <div className="mt-2 text-xs text-surf-ink-muted font-normal" data-three-d-export-channels>
            {THREE_D_COPY.exportChannelsNote}
          </div>
        ) : null}
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
