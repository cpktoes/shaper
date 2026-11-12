"use client";

import { useRef, type RefObject } from "react";
import { LARGE_DIALOG_CLASS, FULL_SCREEN_CLASS } from "@/components/rocker/blank-picker-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useSvgClientSize } from "@/components/viewer/callout-primitives";
import type { BrdFileWithPreview } from "@/lib/export/brd-preview";
import { cn } from "@/lib/utils";
import { THREE_D_COPY } from "./three-d-copy";

const PRIMARY_CLASS = "border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85";
const FOOTER_BUTTON_CLASS = "inline-flex items-center coarse:min-h-11";

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
 * slices and trust the file. It draws only what was read back from the file's own bytes, and Save downloads those bytes.
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
        className={cn(LARGE_DIALOG_CLASS, FULL_SCREEN_CLASS)}
      >
        {prepared && <PreviewBody file={prepared} swallowNote={swallowNote} channelsNote={channelsNote} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

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
  const svgRef = useRef<SVGSVGElement>(null);
  const box = useSvgClientSize(svgRef);
  const width = box.width;
  // A plain fit of the file's own outline to the measured width; nothing is drawn until the box is measured.
  const scale = width > 0 ? (width - 20) / preview.length : 0;
  const halfMax = Math.max(...preview.outline.map(([, hw]) => hw));
  const centre = 8 + halfMax * scale;
  const x = (station: number) => 10 + (preview.length - station) * scale;
  const upper = preview.outline.map(([s, hw]) => `${x(s)},${centre - hw * scale}`);
  const lower = preview.outline.map(([s, hw]) => `${x(s)},${centre + hw * scale}`).reverse();
  return (
    <>
      <div className="flex-none border-b border-surf-line-faint px-4 py-3 max-shell:px-3 max-shell:py-2 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-2">
        <DialogTitle className="text-sm font-extrabold tracking-architectural text-surf-ink uppercase">
          {THREE_D_COPY.previewTitle}
        </DialogTitle>
        <DialogDescription className="text-xs text-surf-ink-muted">{THREE_D_COPY.previewFromFile}</DialogDescription>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 max-shell:px-3 max-shell:py-2 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-2">
        <div className="mx-auto w-full max-w-[1000px]">
          <div className="text-[10px] font-bold tracking-architectural text-surf-ink-muted uppercase">
            {THREE_D_COPY.previewTopView}
          </div>
          <svg
            ref={svgRef}
            data-brd-preview-top
            role="img"
            className="block w-full"
            style={{ height: width > 0 ? 2 * centre : 0 }}
          >
            {width > 0 && (
              <>
                <polygon
                  points={[...upper, ...lower].join(" ")}
                  fill="var(--outline-board-fill)"
                  stroke="var(--outline-ink)"
                  strokeWidth={1.1}
                />
                {preview.slices.map((slice, i) => (
                  <line
                    key={slice.number}
                    data-brd-slice={slice.number}
                    {...(i === preview.openingSlice ? { "data-brd-slice-selected": "" } : {})}
                    x1={x(slice.station)}
                    x2={x(slice.station)}
                    y1={centre - slice.halfWidth * scale}
                    y2={centre + slice.halfWidth * scale}
                    stroke="var(--outline-station-line)"
                    strokeWidth={1}
                  />
                ))}
              </>
            )}
          </svg>
          {swallowNote && (
            <p data-brd-preview-swallow className="mt-2 text-xs text-surf-ink-muted">
              {THREE_D_COPY.exportSwallowNote}
            </p>
          )}
          {channelsNote && (
            <p data-brd-preview-channels className="mt-2 text-xs text-surf-ink-muted">
              {THREE_D_COPY.exportChannelsNote}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-none flex-wrap items-center justify-end gap-2 border-t border-surf-line-faint px-4 py-3 max-shell:px-3 max-shell:py-2 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-2">
        <DialogClose
          render={<Button type="button" variant="ghost" data-lock-exempt className={cn(FOOTER_BUTTON_CLASS, "mr-auto")} />}
        >
          {THREE_D_COPY.previewCancel}
        </DialogClose>
        <Button type="button" data-lock-exempt onClick={onSave} className={cn(PRIMARY_CLASS, FOOTER_BUTTON_CLASS)}>
          {THREE_D_COPY.previewSave}
        </Button>
      </div>
    </>
  );
}
