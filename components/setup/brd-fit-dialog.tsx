"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { BAND_PAD, CAPTION_CLASS, FOOTER_BUTTON_CLASS, PRIMARY_CLASS } from "@/components/3d/brd-preview-dialog";
import { BrdBlankSuggestions, useBrdBlankWords } from "@/components/setup/brd-blank-suggestions";
import { THREE_D_COPY } from "@/components/3d/three-d-copy";
import { HeightPicker } from "@/components/bottom/bottom-section";
import { railLineProps } from "@/components/bottom/side-profile-key";
import { FULL_SCREEN_CLASS, LARGE_DIALOG_CLASS } from "@/components/rocker/blank-picker-dialog";
import { openPrintTab } from "@/components/template/print-pdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUnits } from "@/components/units-provider";
import { useSvgClientSize } from "@/components/viewer/callout-primitives";
import { BRD_PREVIEW_SIDE_HEIGHT } from "@/lib/export/brd-preview";
import { BRD_FIT_COPY, brdFitFrames, brdFitSheet, type BrdFitLook, type BrdFitTable } from "@/lib/export/brd-fit-preview";
import { sectionHeightLabel, type SectionHeight } from "@/lib/geometry/bottom-draw";
import { cn } from "@/lib/utils";

export interface BrdFitDialogProps {
  /** The file as read and our closest fit to it; null while the dialog is closed. */
  look: BrdFitLook | null;
  /** The picked file's name, shown as plain text (never as HTML). */
  fileName: string;
  onOpenChange: (open: boolean) => void;
  /** Open as a Board: opens our closest fit as a new board and closes this preview. Null when the fit can't open (no button). */
  onOpenBoard: (() => void) | null;
  /** The Open a board file… button: focus goes back to it when the dialog closes. */
  finalFocus: RefObject<HTMLButtonElement | null>;
}

const pointsOf = (points: readonly (readonly [number, number])[]) => points.map(([x, y]) => `${x},${y}`).join(" ");

/**
 * The closest-fit preview of a `.brd` file (quick 261113-d9b, the founder's ruling R1; extended by quick 261113-et0, E1-E3):
 * the file in solid ink, our closest fit dashed over it, how close that gets, the widths, rocker and thickness at our five
 * stations beside the file's own, and the settings that make the fit. Three ways out, in the footer: Print Overview (a
 * one-page sheet to keep beside the opened board; the preview stays open), Open as a Board (our fit as a new, unsaved board,
 * the setup screen asking its usual question first when a board is in progress) and Close, which changes nothing. Escape and
 * the backdrop close it too. `lib/export/brd-fit-preview.ts` works every shape, word and table out, once, in `brdFitSheet`,
 * which the printed page reads too; this only paints them, in the Board file preview's own family (same bands, same tokens,
 * same nose-left drawing). The PDF library loads only when Print Overview is pressed. Under the rocker table sits the SUGGESTED
 * BLANKS block (quick 261113-gwo): one blank from each maker the shaper shows, its rocker closest to the file's, fetched and
 * worked out only while this preview is open (`brd-blank-suggestions.tsx`); a suggestion only, Open as a Board still opens the
 * fit with no blank picked.
 */
export function BrdFitDialog({ look, fileName, onOpenBoard, onOpenChange, finalFocus }: BrdFitDialogProps) {
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
        {look && <FitBody look={look} fileName={fileName} onOpenBoard={onOpenBoard} />}
      </DialogContent>
    </Dialog>
  );
}

function FitBody({ look, fileName, onOpenBoard }: { look: BrdFitLook; fileName: string; onOpenBoard: (() => void) | null }) {
  const { system } = useUnits();
  const topRef = useRef<SVGSVGElement>(null);
  const box = useSvgClientSize(topRef);
  // Opens at true height each time (this body remounts); never saved.
  const [height, setHeight] = useState<SectionHeight>(BRD_PREVIEW_SIDE_HEIGHT);
  const sheet = useMemo(() => brdFitSheet(look, fileName, system), [look, fileName, system]);
  const blanks = useBrdBlankWords(look, system);
  const [preparing, setPreparing] = useState(false);
  const [printProblem, setPrintProblem] = useState(false);
  const preparingRef = useRef(false);
  // Nothing is drawn until the column is measured, so the server and the first client paint agree.
  const frames = useMemo(() => (box.width > 0 ? brdFitFrames(look, box.width, height) : null), [look, box.width, height]);
  const c = BRD_FIT_COPY;

  /** Print Overview: the sheet the screen is painted from, on paper (a tab to print from on an iPhone, a download on Android). */
  const handlePrint = () => {
    if (preparingRef.current) return;
    preparingRef.current = true;
    setPreparing(true);
    setPrintProblem(false);
    // On a finger the PDF opens in a new tab to print from, and that tab has to open inside the tap itself or the browser
    // blocks it. On a mouse or trackpad nothing opens (`print-pdf.ts`).
    const tab = openPrintTab();
    // One tick later so "Preparing…" paints; the PDF library is fetched only now, so the home page doesn't carry it.
    window.setTimeout(() => {
      void (async () => {
        try {
          const { printBrdOverviewPdf } = await import("@/components/template/build-brd-overview-pdf");
          // The suggested blanks print once they are worked out; asked for a second early, the page goes without the block.
          printBrdOverviewPdf({ look, sheet, fileName, height, blanks: blanks.status === "loading" ? null : blanks }, tab);
        } catch {
          tab?.close();
          setPrintProblem(true);
        } finally {
          preparingRef.current = false;
          setPreparing(false);
        }
      })();
    }, 0);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("flex-none border-b border-surf-line-faint", BAND_PAD)}>
        <DialogTitle className="text-sm font-extrabold tracking-architectural text-surf-ink uppercase">{sheet.title}</DialogTitle>
        <DialogDescription className="text-xs text-surf-ink-muted">{c.description}</DialogDescription>
        <p data-brd-fit-from className="text-xs text-surf-ink-muted">
          {sheet.from}
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
              aria-label={c.topName}
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
              aria-label={c.sideName}
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
              <KeyEntry dashed={false} word={c.keyFile} />
              <KeyEntry dashed word={c.keyOurs} />
            </div>
          </div>

          <p data-brd-fit-size className="text-xs text-surf-ink">
            {sheet.size}
          </p>

          <div className="flex flex-col gap-1">
            <div className={CAPTION_CLASS}>{c.howClose}</div>
            <p data-brd-fit-close-outline className="text-xs text-surf-ink">
              {sheet.closeness.outline}
            </p>
            <p data-brd-fit-close-rocker className="text-xs text-surf-ink">
              {sheet.closeness.rocker}
            </p>
            <p data-brd-fit-close-thickness className="text-xs text-surf-ink">
              {sheet.closeness.thickness}
            </p>
            <p data-brd-fit-tips className="text-xs text-surf-ink-muted">
              {sheet.tipsNote}
            </p>
          </div>

          <div data-brd-fit-tables className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-4">
            {sheet.tables.map((table) => (
              <FitTable key={table.kind} table={table} />
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <p data-brd-fit-rocker-use className="text-xs text-surf-ink-muted">
              {sheet.rockerUse}
            </p>
            {sheet.pointNotes.map((note) => (
              <p key={note} data-brd-fit-point-note className="text-xs text-surf-ink-muted">
                {note}
              </p>
            ))}
          </div>

          <BrdBlankSuggestions words={blanks} />

          <div className="flex flex-col gap-1">
            <div className={CAPTION_CLASS}>{c.controls}</div>
            <div data-brd-fit-controls className="flex flex-col gap-1 text-xs text-surf-ink">
              <p data-brd-fit-control="outline">{sheet.controls.outline}</p>
              <p data-brd-fit-control="nose">{sheet.controls.nose}</p>
              <p data-brd-fit-control="tail">{sheet.controls.tail}</p>
              <p data-brd-fit-control="rocker">{sheet.controls.rocker}</p>
              <p data-brd-fit-control="thickness">{sheet.controls.thickness}</p>
            </div>
          </div>

          <p data-brd-fit-not-read className="text-xs text-surf-ink-muted">
            {sheet.notRead}
          </p>
        </div>
      </div>

      <div className={cn("flex flex-none flex-col gap-1 border-t border-surf-line-faint", BAND_PAD)}>
        {printProblem && (
          <p data-brd-fit-print-problem role="status" className="text-xs text-surf-warning-ink">
            {c.printProblem}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            data-lock-exempt
            data-brd-fit-print
            disabled={preparing}
            onClick={handlePrint}
            className={FOOTER_BUTTON_CLASS}
          >
            {preparing ? c.printing : c.print}
          </Button>
          {onOpenBoard && (
            <Button
              type="button"
              variant="outline"
              data-lock-exempt
              data-brd-fit-open
              onClick={onOpenBoard}
              className={cn(FOOTER_BUTTON_CLASS, PRIMARY_CLASS)}
            >
              {c.openBoard}
            </Button>
          )}
          <DialogClose render={<Button type="button" variant="outline" data-lock-exempt data-brd-fit-close className={FOOTER_BUTTON_CLASS} />}>
            {c.close}
          </DialogClose>
        </div>
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

/** One table of the sheet: the file's figure and ours at each row, the figures right-aligned. */
function FitTable({ table }: { table: BrdFitTable }) {
  return (
    <table data-brd-fit-table={table.kind} className="w-full border-collapse text-xs text-surf-ink">
      <caption className={cn(CAPTION_CLASS, "mb-1 text-left")}>{table.caption}</caption>
      <thead>
        <tr className="border-b border-surf-line-faint">
          <td />
          <th scope="col" className="px-1 py-0.5 text-right font-semibold">
            {BRD_FIT_COPY.columnFile}
          </th>
          <th scope="col" className="px-1 py-0.5 text-right font-semibold">
            {BRD_FIT_COPY.columnFit}
          </th>
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row) => (
          <tr key={row.key} data-brd-fit-row={row.key}>
            <th scope="row" className="py-0.5 pr-1 text-left font-normal text-surf-ink-muted">
              {row.label}
            </th>
            <td data-brd-fit-cell="file" className="px-1 py-0.5 text-right tabular-nums">
              {row.file}
            </td>
            <td data-brd-fit-cell="fit" className="px-1 py-0.5 text-right tabular-nums">
              {row.fit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
