"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { BAND_PAD, CAPTION_CLASS, FOOTER_BUTTON_CLASS } from "@/components/3d/brd-preview-dialog";
import { THREE_D_COPY } from "@/components/3d/three-d-copy";
import { HeightPicker } from "@/components/bottom/bottom-section";
import { railLineProps } from "@/components/bottom/side-profile-key";
import { FULL_SCREEN_CLASS, LARGE_DIALOG_CLASS } from "@/components/rocker/blank-picker-dialog";
import { BOARD_FILE_COPY } from "@/components/setup/board-file-copy";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUnits } from "@/components/units-provider";
import { useSvgClientSize } from "@/components/viewer/callout-primitives";
import { BRD_PREVIEW_SIDE_HEIGHT } from "@/lib/export/brd-preview";
import { brdFitFrames, brdFitWords, type BrdFitLook } from "@/lib/export/brd-fit-preview";
import { sectionHeightLabel, type SectionHeight } from "@/lib/geometry/bottom-draw";
import { cn } from "@/lib/utils";

export interface BrdFitDialogProps {
  /** The file as read and our closest fit to it; null while the dialog is closed. */
  look: BrdFitLook | null;
  /** The picked file's name, shown as plain text (never as HTML). */
  fileName: string;
  onOpenChange: (open: boolean) => void;
  /** The Open a board file… button: focus goes back to it when the dialog closes. */
  finalFocus: RefObject<HTMLButtonElement | null>;
}

const pointsOf = (points: readonly (readonly [number, number])[]) => points.map(([x, y]) => `${x},${y}`).join(" ");

/**
 * The closest-fit look at a `.brd` file (quick 261113-d9b, the founder's ruling R1): the file in solid ink, our closest fit
 * dashed over it, how close that gets, and the settings that make it. A look only: Close is the one way out (Escape and the
 * backdrop close it too), and nothing is opened, saved or sent. `lib/export/brd-fit-preview.ts` works every shape and word
 * out; this only paints them, in the Board file preview's own family (same bands, same tokens, same nose-left drawing).
 */
export function BrdFitDialog({ look, fileName, onOpenChange, finalFocus }: BrdFitDialogProps) {
  return (
    <Dialog open={look !== null} onOpenChange={onOpenChange}>
      <DialogContent
        data-brd-fit
        showCloseButton={false}
        finalFocus={finalFocus}
        // Focus starts on Close, in the pinned footer: starting on the first control in the scrolling body would scroll the
        // drawings out from under the header on a short screen.
        initialFocus={() => document.querySelector<HTMLElement>("[data-brd-fit-close]")}
        className={cn(LARGE_DIALOG_CLASS, FULL_SCREEN_CLASS)}
      >
        {look && <FitBody look={look} fileName={fileName} />}
      </DialogContent>
    </Dialog>
  );
}

function FitBody({ look, fileName }: { look: BrdFitLook; fileName: string }) {
  const { system } = useUnits();
  const topRef = useRef<SVGSVGElement>(null);
  const box = useSvgClientSize(topRef);
  // Opens at true height each time (this body remounts); never saved.
  const [height, setHeight] = useState<SectionHeight>(BRD_PREVIEW_SIDE_HEIGHT);
  const words = useMemo(() => brdFitWords(look, system), [look, system]);
  // Nothing is drawn until the column is measured, so the server and the first client paint agree.
  const frames = useMemo(() => (box.width > 0 ? brdFitFrames(look, box.width, height) : null), [look, box.width, height]);
  const c = BOARD_FILE_COPY;
  const w = words.controls;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("flex-none border-b border-surf-line-faint", BAND_PAD)}>
        <DialogTitle className="text-sm font-extrabold tracking-architectural text-surf-ink uppercase">{c.fitTitle}</DialogTitle>
        <DialogDescription className="text-xs text-surf-ink-muted">{c.fitDescription}</DialogDescription>
        <p data-brd-fit-from className="text-xs text-surf-ink-muted">
          {c.fitFrom(fileName)}
        </p>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto", BAND_PAD)} data-brd-fit-body>
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3 [@media(max-height:500px)]:max-w-[560px]">
          <div>
            <div className={cn(CAPTION_CLASS, "mb-1")}>{THREE_D_COPY.previewTopView}</div>
            <svg
              ref={topRef}
              data-brd-fit-top
              role="img"
              aria-label={c.fitTopName}
              viewBox={frames ? `0 0 ${frames.width} ${frames.top.height}` : undefined}
              className="block w-full"
              style={{ height: frames ? frames.top.height : 0 }}
            >
              {frames && (
                <>
                  <polygon data-brd-fit-line="file" points={pointsOf(frames.top.file)} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={1.1} />
                  <line
                    x1={frames.top.stringer.x1}
                    x2={frames.top.stringer.x2}
                    y1={frames.top.stringer.y}
                    y2={frames.top.stringer.y}
                    stroke="var(--outline-station-line)"
                    strokeWidth={1}
                    strokeDasharray="var(--outline-stringer-dash)"
                  />
                  <polygon data-brd-fit-line="fit" points={pointsOf(frames.top.fit)} fill="none" {...railLineProps(1)} />
                </>
              )}
            </svg>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className={CAPTION_CLASS} data-brd-fit-side-caption>
                {THREE_D_COPY.previewSideViewAt(sectionHeightLabel({ heightAsked: height, heightDrawn: height }))}
              </div>
              <div data-brd-fit-height>
                <HeightPicker height={height} onHeight={setHeight} which="side" />
              </div>
            </div>
            <svg
              data-brd-fit-side
              data-brd-fit-side-height={height}
              role="img"
              aria-label={c.fitSideName}
              viewBox={frames ? `0 0 ${frames.width} ${frames.side.height}` : undefined}
              className="block w-full"
              style={{ height: frames ? frames.side.height : 0 }}
            >
              {frames && (
                <>
                  <polygon data-brd-fit-line="file" points={pointsOf(frames.side.file)} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" strokeWidth={1.1} />
                  <polyline data-brd-fit-line="fit-bottom" points={pointsOf(frames.side.fitBottom)} fill="none" {...railLineProps(1)} />
                  <polyline data-brd-fit-line="fit-deck" points={pointsOf(frames.side.fitDeck)} fill="none" {...railLineProps(1)} />
                </>
              )}
            </svg>
            <div data-brd-fit-key className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surf-ink-muted">
              <KeyEntry dashed={false} word={c.fitKeyFile} />
              <KeyEntry dashed word={c.fitKeyOurs} />
            </div>
          </div>

          <p data-brd-fit-size className="text-xs text-surf-ink">
            {c.fitSize(words.size)}
          </p>

          <div className="flex flex-col gap-1">
            <div className={CAPTION_CLASS}>{c.fitHowClose}</div>
            <p data-brd-fit-close-outline className="text-xs text-surf-ink">
              {c.fitCloseness("Outline", words.outline.largest, words.outline.typical, words.outline.at)}
            </p>
            <p data-brd-fit-close-rocker className="text-xs text-surf-ink">
              {c.fitCloseness("Rocker", words.rocker.largest, words.rocker.typical, words.rocker.at)}
            </p>
            <p data-brd-fit-close-thickness className="text-xs text-surf-ink">
              {c.fitCloseness("Thickness", words.thickness.largest, words.thickness.typical, words.thickness.at)}
            </p>
            <p data-brd-fit-tips className="text-xs text-surf-ink-muted">
              {c.fitTipsNote(words.tipSkip)}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <div className={CAPTION_CLASS}>{c.fitControls}</div>
            <div data-brd-fit-controls className="flex flex-col gap-1 text-xs text-surf-ink">
              <p data-brd-fit-control="outline">{c.fitOutlineLine(w.length, w.width, w.offset)}</p>
              <p data-brd-fit-control="nose">{c.fitNoseLine(w.noseAngle, w.noseFullness, w.noseRail)}</p>
              <p data-brd-fit-control="tail">{c.fitTailLine(w.tail, w.tailBlock, w.tailAngle, w.tailFullness, w.tailRail)}</p>
              <p data-brd-fit-control="rocker">
                {c.fitRockerLine(w.rocker.noseTip, w.rocker.nose12, w.rocker.tail12, w.rocker.tailTip, w.station)}
              </p>
              <p data-brd-fit-control="thickness">
                {c.fitThicknessLine(w.thickness.noseTip, w.thickness.nose12, w.thickness.center, w.thickness.tail12, w.thickness.tailTip, w.station)}
              </p>
            </div>
          </div>

          <p data-brd-fit-not-read className="text-xs text-surf-ink-muted">
            {c.fitNotRead}
          </p>
        </div>
      </div>

      <div className={cn("flex flex-none flex-wrap items-center justify-end gap-2 border-t border-surf-line-faint", BAND_PAD)}>
        <DialogClose render={<Button type="button" variant="outline" data-lock-exempt data-brd-fit-close className={FOOTER_BUTTON_CLASS} />}>
          {c.fitClose}
        </DialogClose>
      </div>
    </div>
  );
}

/** One swatch of the key: a short line in the drawing's own stroke, then what it is (like `SideProfileKey`'s entries). */
function KeyEntry({ dashed, word }: { dashed: boolean; word: string }) {
  return (
    <div data-brd-fit-key-entry={dashed ? "fit" : "file"} className="flex items-center gap-1.5">
      <svg aria-hidden width={24} height={6} viewBox="0 0 24 6" className="flex-none">
        <line x1={0} x2={24} y1={3} y2={3} {...(dashed ? railLineProps(1) : { stroke: "var(--outline-ink)", strokeWidth: 1.1 })} />
      </svg>
      <span>{word}</span>
    </div>
  );
}
