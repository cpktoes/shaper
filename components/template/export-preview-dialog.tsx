"use client";

/**
 * The preview-first print window (D-04): an artifact picker (Overview Sheet vs. Full Sized Template)
 * over shared paper-size/preview chrome, before any PDF bytes exist, then builds the PDF only
 * when "Print" is pressed and hands it to the browser's print window (fast task, 2026-10-15, the
 * founder: "print the output rather than force a download. The user can save to PDF if they want.
 * But everything else on the app prints rather than downloads" — `print-pdf.ts`). It was the
 * "Export Template" window with a "Download PDF" button until then. Shared by both entry points
 * (Template screen toolbar, Summary screen action row, D-03) via the `trigger` prop, so there is
 * exactly one dialog implementation.
 *
 * Post-checkpoint addition (03-04): originally this dialog only ever built the full, true-size
 * tiled template. Modeled on the user's own iShaper reference screenshot, it now opens on an
 * artifact picker — "Overview Sheet" (one page, every input value plus a scaled reference
 * drawing, `build-overview-pdf.ts`) and "Full Sized Template" (the original tape-together tiled
 * template, `build-template-pdf.ts`, unchanged) — so a shaper who just wants the numbers doesn't
 * have to tape sixteen pages together to get them. Full Sized Template stays the default selection: the
 * dialog's pre-existing behavior regresses for nobody who doesn't touch the new picker. "One
 * capability, one name" (D-03) still holds for the Print button itself — one accent-filled
 * action regardless of which artifact is selected, per the UI spec's accent reservation.
 *
 * Quick task 260902-cj5 added a third card, "Paper Saver" (`build-strip-pdf.ts`): the same board
 * as a single-column strip of landscape pages, each one slid sideways onto the curve, printing
 * noticeably fewer sheets than the Full Sized Template's two-column grid for the same board and paper.
 * Full Sized Template is STILL the dialog's default selection — nothing about picking Paper Saver ever
 * runs unless a shaper actively selects that card. The picker's own layout went from a two-up
 * grid to one stacked column (three cards no longer fit two-up without wrapping their titles),
 * and the dialog gained a max-height + scroll so the taller picker can never push the Print
 * button off a laptop-height screen.
 *
 * Reads `useDesign()` itself rather than taking design props — the Summary screen and the
 * Template screen share the same live design store, so no prop threading is needed to reach
 * either screen. The paper pick and the artifact pick are both local `useState`, never
 * design-store fields: view preferences, exactly like `showConstruction`/`orientation` in
 * `outline-editor.tsx`.
 *
 * The dialog's own trigger is rendered through Base UI's `DialogTrigger` `render` prop, which
 * auto-manages `aria-expanded`/`aria-haspopup` on whatever element each screen supplies — that is
 * what lets each entry point style its own "dialog is open" background purely in CSS
 * (`aria-expanded:...`) without this component threading its open state back out.
 */

import { useMemo, useRef, useState, type CSSProperties, type ReactElement } from "react";
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
import { wingFigures } from "@/lib/geometry/wing-figures";
import { placedWings } from "@/lib/geometry/wings";
import { useUnits } from "@/components/units-provider";
import { printOverviewPdf } from "@/components/template/build-overview-pdf";
import { printTemplatePdf } from "@/components/template/build-template-pdf";
import { printStripPdf } from "@/components/template/build-strip-pdf";
import { openPrintTab } from "@/components/template/print-pdf";
import {
  PAPER_MM,
  computeStripLayout,
  computeTemplateLayout,
  computeTemplateMarks,
  type PaperSize,
  type StripLayout,
  type TemplateLayout,
} from "@/lib/geometry/template";
import { cn } from "@/lib/utils";
import { PrinterIcon } from "lucide-react";

/** Which printable artifact the dialog is currently building — "full" is the default so the
 * dialog's pre-existing single-artifact behavior stays the path of least surprise. */
type ExportArtifact = "overview" | "full" | "strip";

/** The picker's own three cards — stacked one per row (quick task 260902-cj5: a two-up grid
 * shredded "Paper Saver" onto two lines and squeezed every description at three columns). Never
 * "segments" for the strip's own name — it is a continuous strip, not cut-apart pieces. */
const ARTIFACT_CARDS: { value: ExportArtifact; title: string; description: string }[] = [
  {
    value: "overview",
    title: "Overview Sheet",
    description: "Every input value and the outline, one page.",
  },
  {
    value: "full",
    title: "Full Sized Template",
    description: "True-size, full-length half board template.",
  },
  {
    value: "strip",
    title: "Full Sized Template - Paper Saver",
    description: 'True-size, full-length landscape print. Great for boards ≤20.5" Wide.',
  },
];

/** Selected state is an accent BORDER, not the accent FILL the Print button carries — the
 * UI spec reserves solid accent fill for that one button and the tile diagram's nose-page badge,
 * so the picker's own selected state uses the same border+ring treatment
 * `preset-card.tsx`/`board-rack-card.tsx` already use for their own hover/focus states, just
 * driven by `aria-pressed` instead. */
const ARTIFACT_CARD_CLASS =
  "flex flex-col gap-1 rounded-lg border border-surf-line bg-surf-canvas p-3 text-left outline-none transition-colors hover:border-surf-accent-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink aria-pressed:border-surf-accent-ink aria-pressed:ring-2 aria-pressed:ring-surf-accent-ink";

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

/** The Paper Saver's preview (fast task, 2026-10-15, the founder: "add a preview of the paper layout
 * like the full sized template has"): its landscape pages in one column, each set across by the
 * same share of a page as the real sheet slides sideways to follow the rail, so the column wanders
 * down the board the way the printed strip does. */
interface StripDiagramSizing {
  cellWidth: number;
  cellHeight: number;
  /** Each page's left edge, in CSS pixels from the column's leftmost page. */
  offsets: number[];
  width: number;
}

/** One pixels-per-millimetre scale for the whole column — the pages' own landscape size and their
 * slides read at the same scale — fitted inside the same pixel budget as the Full Sized Template's
 * grid, with the same cell-width floor and ceiling. */
function computeStripDiagramSizing(layout: StripLayout): StripDiagramSizing {
  const paperDims = PAPER_MM[layout.paper];
  const pageWidthMm = paperDims.height; // landscape: the long edge runs across the board
  const pageHeightMm = paperDims.width;
  const slides = layout.pages.map((page) => page.halfWidthRange[0]);
  const minSlide = Math.min(...slides);
  const spreadMm = Math.max(...slides) - minSlide;
  const n = layout.pages.length;

  const widthBound = DIAGRAM_MAX_WIDTH_PX / (spreadMm + pageWidthMm);
  const heightBound = (DIAGRAM_MAX_HEIGHT_PX - (n - 1) * DIAGRAM_GAP_PX) / (n * pageHeightMm);
  const pxPerMm =
    Math.min(DIAGRAM_MAX_CELL_WIDTH_PX, Math.max(DIAGRAM_MIN_CELL_WIDTH_PX, Math.min(widthBound, heightBound) * pageWidthMm)) /
    pageWidthMm;

  return {
    cellWidth: pageWidthMm * pxPerMm,
    cellHeight: pageHeightMm * pxPerMm,
    offsets: slides.map((slide) => (slide - minSlide) * pxPerMm),
    width: (spreadMm + pageWidthMm) * pxPerMm,
  };
}

/** One numbered page in a preview — page 1 (the nose) filled with the accent, the rest outlined. */
function PreviewPage({ index, style }: { index: number; style?: CSSProperties }) {
  return (
    <div
      style={style}
      className={cn(
        "flex items-center justify-center rounded-sm border text-[10px] font-medium leading-none",
        index === 0
          ? "border-surf-on-accent bg-surf-accent text-surf-on-accent"
          : "border-surf-line bg-surf-panel text-surf-ink-muted",
      )}
    >
      {index + 1}
    </div>
  );
}

export function ExportPreviewDialog({ trigger }: { trigger: ReactElement }) {
  const { outline, outlineGeometry, boardName, templateValues, railValues, quotedVolumeLitres, wingFinEdges } =
    useDesign();
  const { system } = useUnits();
  const [open, setOpen] = useState(false);
  const [artifact, setArtifact] = useState<ExportArtifact>("full");
  const [paperSize, setPaperSize] = useState<PaperSize>("letter");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);
  // Synchronous guard against a second Print press landing before React has committed the
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
  const stripLayout = useMemo(() => computeStripLayout(outlineGeometry, paperSize), [outlineGeometry, paperSize]);
  const diagram = useMemo(() => computeDiagramSizing(layout), [layout]);
  const stripDiagram = useMemo(() => computeStripDiagramSizing(stripLayout), [stripLayout]);
  // The Overview Sheet is always one portrait page — the same cell a one-page Full Sized Template gets.
  const overviewCell = useMemo(
    () => computeDiagramSizing({ ...layout, rows: 1, columns: 1 }),
    [layout],
  );
  // The wings the board draws and their printed figures, worked out once and handed to all three
  // printouts so the Overview Sheet, the Full Sized Template and the Paper Saver can never disagree
  // about a wing (quick 261015-sei, 2026-10-15, P8 — the founder: "Same as WINGS card").
  const placed = useMemo(() => placedWings(outline.wings ?? [], outlineGeometry), [outline.wings, outlineGeometry]);
  const wings = useMemo(() => wingFigures(placed, wingFinEdges, system), [placed, wingFinEdges, system]);
  // The marks both full-size prints draw — the station marks, plus one dashed line at each wing's
  // station (quick 261015-sei, D2). A board with no wings gets exactly the marks it always did.
  const marks = useMemo(() => computeTemplateMarks(outlineGeometry, placed), [outlineGeometry, placed]);
  const pageCount = layout.pages.length;
  const stripPageCount = stripLayout.pages.length;

  // Built once and handed to whichever of Full Sized Template / Paper Saver is selected, so the two
  // branches can never drift apart over what this board measures (post-checkpoint fix, defect 3
  // refinement carried forward from the Full Sized Template's own dims — see
  // components/summary/order-form.tsx's DimensionCell strip for where these values originate).
  const dims = {
    length: templateValues.length,
    widePointWidth: templateValues.widePointWidth,
    centerThickness: railValues.centerThickness,
    noseWidth12in: outlineGeometry.noseWidthAt12in,
    tailWidth12in: outlineGeometry.tailWidthAt12in,
    widePointOffset: outline.widePointOffset,
    volumeLitres: quotedVolumeLitres,
    // Each wing's numbers, listed in the name box under the dims row (quick 261015-sei, D2) — the
    // same array the Overview Sheet prints (P8).
    wings,
  };

  function handlePrint() {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    setError(false);
    // On a finger the PDF opens in a new tab to print from, and that tab has to open inside the tap
    // itself or the browser blocks it — so it opens now, empty, and is filled once the PDF is built.
    // On a mouse or trackpad nothing opens (`print-pdf.ts`).
    const tab = openPrintTab();
    // Deferred one tick so "Preparing…" actually paints before the synchronous jsPDF work
    // runs — a large multi-page board's drawing work is not guaranteed to be instant, and the
    // whole point of the label swap is a visible state between the press and the print window.
    window.setTimeout(() => {
      try {
        if (artifact === "overview") {
          printOverviewPdf({
            geometry: outlineGeometry,
            outline,
            paper: paperSize,
            boardName,
            system,
            wings,
          }, tab);
        } else if (artifact === "strip") {
          printStripPdf({
            layout: stripLayout,
            marks,
            geometry: outlineGeometry,
            paper: paperSize,
            boardName,
            dims,
            system,
          }, tab);
        } else {
          printTemplatePdf({
            layout,
            marks,
            geometry: outlineGeometry,
            paper: paperSize,
            boardName,
            dims,
            system,
          }, tab);
        }
        generatingRef.current = false;
        setGenerating(false);
        setOpen(false);
      } catch {
        tab?.close();
        generatingRef.current = false;
        setGenerating(false);
        setError(true);
      }
    }, 0);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85dvh] overflow-y-auto border-surf-line-faint bg-surf-panel text-surf-ink sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-surf-ink">Print Template</DialogTitle>
          <DialogDescription>Choose what to print. To keep a file, pick Save as PDF in the print window.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-2" role="group" aria-label="What to print">
            {ARTIFACT_CARDS.map((card) => (
              <button
                key={card.value}
                type="button"
                aria-pressed={artifact === card.value}
                onClick={() => setArtifact(card.value)}
                className={ARTIFACT_CARD_CLASS}
              >
                <span className="text-sm font-semibold text-surf-ink">{card.title}</span>
                <span className="text-xs text-surf-ink-muted">{card.description}</span>
              </button>
            ))}
          </div>

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

          {artifact === "full" ? (
            <>
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
                    <PreviewPage key={page.index} index={page.index} />
                  ))}
                </div>
              </div>

              <p className="text-sm text-surf-ink-muted">
                {pageCount === 1 ? "1 page — no taping needed." : `${pageCount} pages — tape nose to tail.`}
              </p>
            </>
          ) : artifact === "strip" ? (
            <>
              <div className="flex justify-center">
                <div
                  role="img"
                  aria-label={`${stripPageCount} sideways page${
                    stripPageCount === 1 ? "" : "s"
                  } in one column, each moved across to follow the rail, nose at page 1`}
                  className="flex flex-col"
                  style={{ width: stripDiagram.width, gap: DIAGRAM_GAP_PX }}
                >
                  {stripLayout.pages.map((page, i) => (
                    <PreviewPage
                      key={page.index}
                      index={page.index}
                      style={{
                        width: stripDiagram.cellWidth,
                        height: stripDiagram.cellHeight,
                        marginLeft: stripDiagram.offsets[i],
                      }}
                    />
                  ))}
                </div>
              </div>

              <p className="text-sm text-surf-ink-muted">
                {stripPageCount} page{stripPageCount === 1 ? "" : "s"} instead of {pageCount} — the curve only, one
                page at a time.
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <div role="img" aria-label="1 page">
                  <PreviewPage index={0} style={{ width: overviewCell.cellWidth, height: overviewCell.cellHeight }} />
                </div>
              </div>

              <p className="text-sm text-surf-ink-muted">
                1 page — all the numbers needed to recreate this board.
              </p>
            </>
          )}

          {error && (
            <p className="text-sm text-destructive">{"Couldn't get the pages ready to print — try again."}</p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button
            type="button"
            onClick={handlePrint}
            disabled={generating}
            className="border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85"
          >
            <PrinterIcon aria-hidden="true" />
            {generating ? "Preparing…" : "Print"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
