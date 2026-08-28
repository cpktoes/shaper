"use client";

/**
 * The preview-first export dialog (D-04): shows how the board splits across pages — paper picker,
 * tile-grid diagram, page count — before any PDF bytes exist, then builds the file only when
 * "Download PDF" is pressed. Shared by both entry points (Template screen toolbar, Summary screen
 * action row, D-03) via the `trigger` prop, so there is exactly one dialog implementation.
 *
 * Reads `useDesign()` itself rather than taking design props — the Summary screen and the
 * Template screen share the same live design store, so no prop threading is needed to reach
 * either screen. The paper pick is local `useState`, never a design-store field: a view
 * preference, exactly like `showConstruction`/`orientation` in `outline-editor.tsx`.
 *
 * The dialog's own trigger is rendered through Base UI's `DialogTrigger` `render` prop, which
 * auto-manages `aria-expanded`/`aria-haspopup` on whatever element each screen supplies — that is
 * what lets each entry point style its own "dialog is open" background purely in CSS
 * (`aria-expanded:...`) without this component threading its open state back out.
 */

import { useMemo, useRef, useState, type ReactElement } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from "@/components/design/design-store";
import { downloadTemplatePdf } from "@/components/template/build-template-pdf";
import {
  PAPER_MM,
  computeTemplateLayout,
  computeTemplateMarks,
  type PaperSize,
  type TemplateLayout,
} from "@/lib/geometry/template";
import { cn } from "@/lib/utils";

/** Pixel budget the tile diagram must stay inside, regardless of board shape — the dialog's own
 * `sm:max-w-sm` content width (384px) minus its `p-4` padding on both sides. Sized well under
 * that so a multi-column grid (the 25in-widepoint case) never pushes the dialog wider. */
const DIAGRAM_MAX_WIDTH_PX = 260;
const DIAGRAM_MAX_HEIGHT_PX = 280;
/** Cell size floor/ceiling — the floor keeps a many-page grid's numbers legible, the ceiling
 * keeps a one- or two-page grid from rendering a single giant cell. */
const DIAGRAM_MIN_CELL_WIDTH_PX = 14;
const DIAGRAM_MAX_CELL_WIDTH_PX = 56;
const DIAGRAM_GAP_PX = 2;

interface DiagramSizing {
  cellWidth: number;
  cellHeight: number;
}

/** Derives one cell size (in CSS pixels) that fits `layout`'s full `rows` x `columns` grid, at the
 * chosen paper's own portrait aspect ratio, inside the fixed pixel budget above — the "doesn't
 * overflow or crowd the dialog" contract Task 3's held-out visual check verifies. */
function computeDiagramSizing(layout: TemplateLayout): DiagramSizing {
  const paperDims = PAPER_MM[layout.paper];
  const paperAspect = paperDims.height / paperDims.width; // > 1: portrait, taller than wide.

  const widthBound = (DIAGRAM_MAX_WIDTH_PX - (layout.columns - 1) * DIAGRAM_GAP_PX) / layout.columns;
  const heightBound =
    (DIAGRAM_MAX_HEIGHT_PX - (layout.rows - 1) * DIAGRAM_GAP_PX) / (layout.rows * paperAspect);

  const cellWidth = Math.min(
    DIAGRAM_MAX_CELL_WIDTH_PX,
    Math.max(DIAGRAM_MIN_CELL_WIDTH_PX, Math.min(widthBound, heightBound)),
  );
  return { cellWidth, cellHeight: cellWidth * paperAspect };
}

export function ExportPreviewDialog({ trigger }: { trigger: ReactElement }) {
  const { outline, outlineGeometry, boardName, templateValues, railValues, volumeResult } = useDesign();
  const [open, setOpen] = useState(false);
  const [paperSize, setPaperSize] = useState<PaperSize>("letter");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);
  // Synchronous guard against a second Download press landing before React has committed the
  // disabled-button re-render — `generating` state alone can't prevent that, since both clicks
  // could fire inside the same event-loop turn.
  const generatingRef = useRef(false);

  // Re-arms every time the dialog is freshly opened, same render-phase reset pattern as
  // delete-confirm-dialog.tsx / rename-dialog.tsx: a stale error from a previous attempt never
  // bleeds into the next open.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setError(false);
  }

  // Pure geometry, no IO — recomputed synchronously whenever the paper pick changes, so the page
  // count and the diagram both respond to it. No loading state: none is reachable here.
  const layout = useMemo(() => computeTemplateLayout(outlineGeometry, paperSize), [outlineGeometry, paperSize]);
  const diagram = useMemo(() => computeDiagramSizing(layout), [layout]);
  const pageCount = layout.pages.length;

  function handleDownload() {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    setError(false);
    // Deferred one tick so "Preparing PDF…" actually paints before the synchronous jsPDF work
    // runs — a large multi-page board's drawing work is not guaranteed to be instant, and the
    // whole point of the label swap is a visible state between the press and the download.
    window.setTimeout(() => {
      try {
        downloadTemplatePdf({
          layout,
          marks: computeTemplateMarks(outlineGeometry),
          geometry: outlineGeometry,
          paper: paperSize,
          boardName,
          dims: {
            length: templateValues.length,
            widePointWidth: templateValues.widePointWidth,
            centerThickness: railValues.centerThickness,
            // Post-checkpoint fix (defect 3 refinement): the same values the Summary order
            // form's own dimensions row reads, from the same design state — see
            // components/summary/order-form.tsx's DimensionCell strip.
            noseWidth12in: outlineGeometry.noseWidthAt12in,
            tailWidth12in: outlineGeometry.tailWidthAt12in,
            widePointOffset: outline.widePointOffset,
            volumeLitres: volumeResult.volumeLitres,
          },
        });
        generatingRef.current = false;
        setGenerating(false);
        setOpen(false);
      } catch {
        generatingRef.current = false;
        setGenerating(false);
        setError(true);
      }
    }, 0);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="border-surf-line-faint bg-surf-panel text-surf-ink sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-surf-ink">Export Full-Size Template</DialogTitle>
          <DialogDescription>Prints at true size, tiled across pages you tape together.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2" role="group" aria-label="Paper size">
            <Button
              type="button"
              variant="outline"
              aria-pressed={paperSize === "letter"}
              onClick={() => setPaperSize("letter")}
              className="flex-1 aria-pressed:bg-muted aria-pressed:text-foreground"
            >
              Letter
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-pressed={paperSize === "a4"}
              onClick={() => setPaperSize("a4")}
              className="flex-1 aria-pressed:bg-muted aria-pressed:text-foreground"
            >
              A4
            </Button>
          </div>

          <div className="flex justify-center">
            <div
              role="img"
              aria-label={`${layout.rows} row${layout.rows === 1 ? "" : "s"} by ${layout.columns} column${
                layout.columns === 1 ? "" : "s"
              } of pages, nose at page 1`}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${layout.columns}, ${diagram.cellWidth}px)`,
                gridTemplateRows: `repeat(${layout.rows}, ${diagram.cellHeight}px)`,
                gap: DIAGRAM_GAP_PX,
              }}
            >
              {layout.pages.map((page) => (
                <div
                  key={page.index}
                  className={cn(
                    "flex items-center justify-center rounded-sm border text-[10px] font-medium leading-none",
                    page.index === 0
                      ? "border-surf-on-accent bg-surf-accent text-surf-on-accent"
                      : "border-surf-line bg-surf-panel text-surf-ink-muted",
                  )}
                >
                  {page.index + 1}
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-surf-ink-muted">
            {pageCount === 1 ? "1 page — no taping needed." : `${pageCount} pages — tape nose to tail.`}
          </p>

          {error && (
            <p className="text-sm text-destructive">{"Couldn't build the PDF — try again."}</p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={generating}
            className="border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85"
          >
            {generating ? "Preparing PDF…" : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
