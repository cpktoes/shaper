"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type RefObject } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { FULL_SCREEN_CLASS, LARGE_DIALOG_CLASS } from "@/components/rocker/blank-picker-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUnits } from "@/components/units-provider";
import { useSvgClientSize } from "@/components/viewer/callout-primitives";
import {
  brdPreviewFrames,
  brdPreviewWords,
  brdSliceNearest,
  brdStationAtX,
  type BrdFileWithPreview,
  type BrdSliceLine,
} from "@/lib/export/brd-preview";
import { cn } from "@/lib/utils";
import { THREE_D_COPY } from "./three-d-copy";

const PRIMARY_CLASS = "border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85";
const FOOTER_BUTTON_CLASS = "inline-flex items-center coarse:min-h-11";

/** Padding of the header, body and footer: the same tightening under an upright phone and a short screen (never a third rule). */
const BAND_PAD = "px-4 py-3 max-shell:px-3 max-shell:py-2 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-2";

/** The small-caps caption above a drawing, the app's own label style. */
const CAPTION_CLASS = "text-[10px] font-bold tracking-architectural text-surf-ink-muted uppercase";

export interface BrdPreviewDialogProps {
  /** The file and the preview read back from its bytes; null while the dialog is closed. */
  prepared: BrdFileWithPreview | null;
  /** The page's own two lines, shown again here when they apply to this file (a swallow written square, channels left out). */
  swallowNote: boolean;
  channelsNote: boolean;
  onSave: () => void;
  onOpenChange: (open: boolean) => void;
  /** The Export button: focus goes back to it when the dialog closes. */
  finalFocus: RefObject<HTMLButtonElement | null>;
}

/**
 * Board file preview (quick 261112-dbi): Export .brd File opens this before anything is downloaded, so a shaper can see the
 * slices and trust the file. It draws only what was read back from the file's own bytes (`lib/export/brd-preview.ts`
 * works every shape out; this only paints), and Save downloads those same bytes. Every button here is `data-lock-exempt`:
 * looking at the file and saving it change nothing on the board.
 */
export function BrdPreviewDialog({
  prepared,
  swallowNote,
  channelsNote,
  onSave,
  onOpenChange,
  finalFocus,
}: BrdPreviewDialogProps) {
  return (
    <Dialog open={prepared !== null} onOpenChange={onOpenChange}>
      <DialogContent
        data-brd-preview
        showCloseButton={false}
        finalFocus={finalFocus}
        // Focus starts on Cancel, in the pinned footer: starting on the first button in the scrolling body would scroll the
        // drawings out from under the header on a short screen, and Cancel is the one button that saves nothing.
        initialFocus={() => document.querySelector<HTMLElement>("[data-brd-preview-cancel]")}
        className={cn(LARGE_DIALOG_CLASS, FULL_SCREEN_CLASS)}
      >
        {prepared && <PreviewBody file={prepared} swallowNote={swallowNote} channelsNote={channelsNote} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

/** A thin line across (or up through) the board at one slice, as the app draws a station; the marked one as BOTTOM's cutting line. */
function SliceLines({
  lines,
  selected,
  attr,
}: {
  lines: readonly BrdSliceLine[];
  selected: number;
  attr: string;
}) {
  // The marked slice is drawn last so it sits on top of its neighbours.
  const ordered = [...lines.filter((line) => line.number !== selected), ...lines.filter((line) => line.number === selected)];
  return (
    <>
      {ordered.map((line) => {
        const marked = line.number === selected;
        return (
          <line
            key={line.number}
            data-brd-slice={line.number}
            data-brd-slice-view={attr}
            {...(marked ? { "data-brd-slice-selected": "" } : {})}
            x1={line.x}
            x2={line.x}
            y1={line.y1}
            y2={line.y2}
            stroke={marked ? "var(--outline-ink)" : "var(--outline-station-line)"}
            strokeWidth={marked ? 1.1 : 1}
            strokeDasharray={marked ? "var(--outline-cut-dash)" : "var(--outline-station-dash)"}
          />
        );
      })}
    </>
  );
}

const pointsOf = (points: readonly (readonly [number, number])[]) => points.map(([x, y]) => `${x},${y}`).join(" ");

function PreviewBody({
  file,
  swallowNote,
  channelsNote,
  onSave,
}: {
  file: BrdFileWithPreview;
  swallowNote: boolean;
  channelsNote: boolean;
  onSave: () => void;
}) {
  const { preview } = file;
  const { system } = useUnits();
  const topRef = useRef<SVGSVGElement>(null);
  const box = useSvgClientSize(topRef);
  const count = preview.slices.length;
  // The slice marked in both views and drawn large, as an index into the slices (the file's own order, tail first).
  const [selected, setSelected] = useState(preview.openingSlice);
  const words = useMemo(() => brdPreviewWords(preview, system), [preview, system]);
  // Nothing is drawn until the column is measured, so the server and the first client paint agree.
  const frames = useMemo(() => (box.width > 0 ? brdPreviewFrames(preview, box.width) : null), [preview, box.width]);

  // The nose is at the left, so ‹ and the left arrow move toward the nose: the next slice up from the tail.
  const step = (by: number) => setSelected((now) => Math.min(count - 1, Math.max(0, now + by)));
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    step(event.key === "ArrowLeft" ? 1 : -1);
  };
  // A tap or click anywhere on the top or side view picks the slice nearest to it: a one-dot line is no target for a finger.
  const pick = (event: MouseEvent<SVGSVGElement>) => {
    const ctm = event.currentTarget.getScreenCTM();
    if (!frames || !ctm) return;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    setSelected(brdSliceNearest(preview, brdStationAtX(frames, local.x)));
  };

  const number = preview.slices[selected].number;
  const sliceFrame = frames?.slices[selected];
  return (
    <div className="flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown}>
      <div className={cn("flex-none border-b border-surf-line-faint", BAND_PAD)}>
        <DialogTitle className="text-sm font-extrabold tracking-architectural text-surf-ink uppercase">
          {THREE_D_COPY.previewTitle}
        </DialogTitle>
        <DialogDescription className="text-xs text-surf-ink-muted">{THREE_D_COPY.previewFromFile}</DialogDescription>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto", BAND_PAD)} data-brd-preview-body>
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3 [@media(max-height:500px)]:max-w-[560px]">
          <div>
            <div className={cn(CAPTION_CLASS, "mb-1")}>{THREE_D_COPY.previewTopView}</div>
            <svg
              ref={topRef}
              data-brd-preview-top
              role="img"
              aria-label={THREE_D_COPY.previewTopName(count)}
              viewBox={frames ? `0 0 ${frames.width} ${frames.top.height}` : undefined}
              className="block w-full cursor-pointer"
              style={{ height: frames ? frames.top.height : 0 }}
              onClick={pick}
            >
              {frames && (
                <>
                  <polygon points={pointsOf(frames.top.outline)} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={1.1} />
                  <line
                    x1={frames.top.stringer.x1}
                    x2={frames.top.stringer.x2}
                    y1={frames.top.stringer.y}
                    y2={frames.top.stringer.y}
                    stroke="var(--outline-station-line)"
                    strokeWidth={1}
                    strokeDasharray="var(--outline-stringer-dash)"
                  />
                  <SliceLines lines={frames.top.slices} selected={number} attr="top" />
                </>
              )}
            </svg>
          </div>

          <div>
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className={CAPTION_CLASS}>{THREE_D_COPY.previewSlice}</div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                data-lock-exempt
                data-brd-preview-toward-nose
                aria-label={THREE_D_COPY.previewTowardNose}
                disabled={selected >= count - 1}
                onClick={() => step(1)}
                className="coarse:size-11"
              >
                <ChevronLeftIcon />
              </Button>
              <div data-brd-preview-slice-line aria-live="polite" className="text-xs text-surf-ink">
                {THREE_D_COPY.previewSliceLine(number, count, words.stations[selected])}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                data-lock-exempt
                data-brd-preview-toward-tail
                aria-label={THREE_D_COPY.previewTowardTail}
                disabled={selected <= 0}
                onClick={() => step(-1)}
                className="coarse:size-11"
              >
                <ChevronRightIcon />
              </Button>
            </div>
            <svg
              data-brd-preview-slice
              data-brd-preview-slice-at={number}
              role="img"
              aria-label={THREE_D_COPY.previewSliceName(number, count)}
              viewBox={frames ? `0 0 ${frames.width} ${frames.sliceHeight}` : undefined}
              className="block w-full"
              style={{ height: frames ? frames.sliceHeight : 0 }}
            >
              {frames && sliceFrame && (
                <>
                  <polygon points={pointsOf(sliceFrame.outline)} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={1.1} />
                  <line
                    x1={sliceFrame.stringer.x}
                    x2={sliceFrame.stringer.x}
                    y1={sliceFrame.stringer.y1}
                    y2={sliceFrame.stringer.y2}
                    stroke="var(--outline-station-line)"
                    strokeWidth={1}
                    strokeDasharray="var(--outline-stringer-dash)"
                  />
                  {sliceFrame.knots.map(([x, y], i) => (
                    <circle key={i} data-brd-slice-knot cx={x} cy={y} r={2} fill="var(--outline-ink)" />
                  ))}
                </>
              )}
            </svg>
          </div>

          <div>
            <div className={cn(CAPTION_CLASS, "mb-1")}>{THREE_D_COPY.previewSideView}</div>
            <svg
              data-brd-preview-side
              role="img"
              aria-label={THREE_D_COPY.previewSideName(count)}
              viewBox={frames ? `0 0 ${frames.width} ${frames.side.height}` : undefined}
              className="block w-full cursor-pointer"
              style={{ height: frames ? frames.side.height : 0 }}
              onClick={pick}
            >
              {frames && (
                <>
                  <polygon points={pointsOf(frames.side.outline)} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={1.1} />
                  <SliceLines lines={frames.side.slices} selected={number} attr="side" />
                </>
              )}
            </svg>
          </div>

          <div data-brd-preview-facts className="text-xs text-surf-ink">
            {THREE_D_COPY.previewFacts(count, words.gap, words.dims)}
          </div>
          {swallowNote && (
            <p data-brd-preview-swallow className="text-xs text-surf-ink-muted">
              {THREE_D_COPY.exportSwallowNote}
            </p>
          )}
          {channelsNote && (
            <p data-brd-preview-channels className="text-xs text-surf-ink-muted">
              {THREE_D_COPY.exportChannelsNote}
            </p>
          )}
        </div>
      </div>

      <div className={cn("flex flex-none flex-wrap items-center justify-end gap-2 border-t border-surf-line-faint", BAND_PAD)}>
        <DialogClose
          render={<Button type="button" variant="ghost" data-lock-exempt data-brd-preview-cancel className={cn(FOOTER_BUTTON_CLASS, "mr-auto")} />}
        >
          {THREE_D_COPY.previewCancel}
        </DialogClose>
        <Button type="button" data-lock-exempt onClick={onSave} className={cn(PRIMARY_CLASS, FOOTER_BUTTON_CLASS)}>
          {THREE_D_COPY.previewSave}
        </Button>
      </div>
    </div>
  );
}
