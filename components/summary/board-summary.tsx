"use client";

/**
 * The Summary screen — a one-page dashboard reading every value from the shared design store
 * (components/design/design-store.tsx) through `useDesign()`. Holds no design state of its own.
 *
 * Every panel renders the *existing* view component under an additive compact prop — see
 * components/outline/outline-viewer.tsx, components/rails/rail-data-table.tsx,
 * components/rails/rail-section-plot.tsx, components/volume/volume-calculation-card.tsx and
 * components/fins/fin-viewer.tsx. No panel reimplements a view, so a printed number can never
 * drift from the screen it came from.
 *
 * Sizing takes its height from app/design/layout.tsx's `flex min-h-0 flex-1 flex-col` column —
 * no `ResizeObserver`, no polling, no `100vh` (Summary.dc.html's `measureRootAvail`, lines
 * 106-137, existed only because that prototype was embedded in an unknown shell; our layout
 * already passes flex height through to every screen).
 *
 * Responsive grid, matching Summary.dc.html's `renderVals` (lines 143-165): three columns /
 * 85fr-15fr rows at 900px and up, one auto-height scrolling column below it, reordered via CSS
 * `order` to the prototype's own stacked order (Template, Rail Plots, Rail Data, Volume + Fins,
 * Board Name).
 */

import type { ReactNode } from "react";
import { useDesign } from "@/components/design/design-store";
import { OutlineViewer } from "@/components/outline/outline-viewer";
import { FinViewer } from "@/components/fins/fin-viewer";
import { RailDataTable } from "@/components/rails/rail-data-table";
import { RailSectionPlot } from "@/components/rails/rail-section-plot";
import { VolumeCalculationCard } from "@/components/volume/volume-calculation-card";
import { Button } from "@/components/ui/button";
import { useSummaryPrintFit } from "./use-print-fit";
import type { RailSectionKey } from "@/lib/geometry/rail-bands";
import { formatFeetInches, formatInchesFraction, inchesToMm, mm } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";

/** Both grid cells below are placed identically (same order/col/row) so the interactive card and
 * its print-only twin occupy the exact same slot — only one is ever visible: the textarea card
 * on screen, the centred name block in print (Summary.dc.html lines 68-78). */
const BOARD_NAME_GRID_PLACEMENT =
  "order-5 min-[900px]:order-none min-[900px]:col-start-3 min-[900px]:row-start-2 min-[900px]:min-h-0";

const SECTION_KEYS: RailSectionKey[] = ["nose", "center", "tail"];
const SECTION_TITLE: Record<RailSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };

function SummaryCard({
  title,
  variant = "padded",
  bodyClassName,
  className,
  children,
}: {
  title: string;
  /** "padded": the card's own padding and a title with bottom margin (Rail Data, Volume Estimate,
   * Board Name). "flush": zero card padding with the title inset by margin instead, so the
   * drawing runs to the card edge (Template, Fin Placement, Rail Plots) — Summary.dc.html lines
   * 39-40, 53-54, 61-62. */
  variant?: "padded" | "flush";
  bodyClassName?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col rounded-xl border border-[#e4ddc9] bg-white",
        variant === "padded" ? "p-1.5" : "p-0",
        className,
      )}
    >
      <div
        className={cn(
          "flex-none text-[13px] font-extrabold tracking-[1px] text-outline-accent uppercase",
          variant === "padded" ? "mb-1" : "mt-1.5 ml-2",
        )}
      >
        {title}
      </div>
      <div className={cn("min-h-0 min-w-0 flex-1 overflow-hidden", bodyClassName)}>{children}</div>
    </div>
  );
}

export function BoardSummary() {
  const {
    outline,
    outlineGeometry,
    finPlacement,
    railBands,
    volumeResult,
    effectiveVolume,
    effectiveFins,
    finTailOutline,
    boardName,
    setBoardName,
  } = useDesign();
  const { rootRef, printSummary } = useSummaryPrintFit();

  // Always all three sections, in Nose/Center/Tail order — unlike the rails screen's own DATA/
  // VIEWER pages, the summary has no collapse state to filter by.
  const sections = SECTION_KEYS.map((key) => ({
    key,
    title: SECTION_TITLE[key],
    dataGroups: railBands[key].dataGroups,
  }));

  // One shared x-axis minimum across all three sections (rail-band-editor.tsx's own
  // sharedXAxisMin derivation), then cropped at -6.5in — the widest of the prototype's three
  // separate per-section compact crops (Rails.dc.html line 1216: -5/-6.5/-5) — so the three
  // plots keep one comparable shared axis instead of three disagreeing ones. Nose and tail show a
  // little more empty inboard space than the prototype's own per-section crops as a result.
  const rawSharedXAxisMinMm = Math.min(
    ...SECTION_KEYS.map((key) => railBands[key].bounds.xAxisMin),
  );
  const croppedSharedXAxisMin = mm(Math.max(rawSharedXAxisMinMm, inchesToMm(-6.5)));

  return (
    <div
      ref={rootRef}
      data-summary-root
      className={cn(
        "grid min-h-0 flex-1 grid-cols-1 auto-rows-auto gap-2 overflow-y-auto bg-outline-page-bg p-2",
        "min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] min-[900px]:grid-rows-[85fr_15fr] min-[900px]:overflow-hidden",
      )}
    >
      <SummaryCard
        title="Rail Data"
        className="order-3 min-h-[360px] min-[900px]:order-none min-[900px]:col-start-1 min-[900px]:row-start-1 min-[900px]:min-h-0"
      >
        <RailDataTable sections={sections} compact />
      </SummaryCard>

      {/* Template — the tracer panel, live from the shared store. */}
      <SummaryCard
        title="Template"
        variant="flush"
        className="order-1 min-h-[360px] min-[900px]:order-none min-[900px]:col-start-2 min-[900px]:row-start-1 min-[900px]:min-h-0"
      >
        <div className="relative flex h-full w-full justify-center">
          {/* Matches OutlineViewer's widened callout-system viewBox (-50 -16 410 638, sketch 004) --
              the old 340/620 ratio was the viewer's pre-callout-system tight board bounds and would
              letterbox/shrink the drawing now that the gutters are part of the SVG's own aspect. */}
          <div className="relative aspect-[410/638] h-full max-w-full">
            <OutlineViewer
              geometry={outlineGeometry}
              outline={outline}
              // Construction lines are a design-time aid on the outline editor; the summary is
              // the sheet a shaper reads at the blank, so they're left off here.
              showConstruction={false}
              // The fin marks belong on the printed template, same as the outline screen.
              finMarks={finPlacement.marks}
              compact
            />
          </div>
        </div>
      </SummaryCard>

      <div className="order-4 flex min-h-[360px] flex-col gap-2 min-[900px]:order-none min-[900px]:col-start-3 min-[900px]:row-start-1 min-[900px]:min-h-0">
        <SummaryCard title="Volume Estimate" className="flex-1 min-h-0">
          <VolumeCalculationCard
            result={volumeResult}
            lengthDisplay={formatFeetInches(effectiveVolume.length)}
            widthDisplayLabel={formatInchesFraction(effectiveVolume.width)}
            centerThicknessDisplayLabel={formatInchesFraction(effectiveVolume.centerThickness)}
            compact
          />
        </SummaryCard>
        <SummaryCard title="Fin Placement" variant="flush" className="flex-1 min-h-0">
          {/* finTailOutline matters here: it draws the *designed* tail outline, the same one the
              fins screen draws when it's importing template values. */}
          <FinViewer
            result={finPlacement}
            tailShape={effectiveFins.tailShape}
            tailWidth12={effectiveFins.tailWidth12}
            boardLength={effectiveFins.boardLength}
            showCallouts
            compact
            outlineOverride={finTailOutline}
          />
        </SummaryCard>
      </div>

      <SummaryCard
        title="Rail Plots"
        variant="flush"
        className="order-2 min-h-[220px] min-[900px]:order-none min-[900px]:col-start-1 min-[900px]:col-span-2 min-[900px]:row-start-2 min-[900px]:min-h-0"
      >
        {/* No per-section titles, no legend — matches the prototype's compact row
            (RAIL_TITLE_ROW_H 0, Rails.dc.html line 1241). */}
        <div className="flex h-full items-center justify-center gap-1">
          {SECTION_KEYS.map((key) => (
            <div key={key} className="flex h-full min-w-0 flex-1 items-center justify-center">
              <RailSectionPlot
                sectionKey={key}
                output={railBands[key]}
                xAxisMin={croppedSharedXAxisMin}
                fit="height"
              />
            </div>
          ))}
        </div>
      </SummaryCard>

      {/* Board Name — interactive card, hidden in print. */}
      <div
        data-print-hide
        className={cn(
          "flex min-h-[360px] min-w-0 flex-col rounded-xl border border-[#e4ddc9] bg-white p-1.5",
          BOARD_NAME_GRID_PLACEMENT,
        )}
      >
        <div className="mb-1 flex flex-none items-center justify-between gap-2">
          <span className="text-[12px] font-extrabold tracking-[1px] text-outline-accent uppercase">
            Board Name
          </span>
          <Button
            type="button"
            size="sm"
            onClick={printSummary}
            className="flex-none border-outline-accent bg-outline-accent text-outline-ink hover:bg-outline-accent/85"
          >
            Print Summary
          </Button>
        </div>
        <textarea
          value={boardName}
          onChange={(e) => setBoardName(e.target.value)}
          placeholder="Board Name"
          rows={2}
          className="min-h-0 w-full flex-1 resize-none rounded-lg border border-[#e4ddc9] bg-white px-2.5 py-1.5 text-sm font-bold text-outline-ink"
        />
      </div>

      {/* Board Name — print-only twin, shown only inside @media print (summary.css). Naming the
          name in JSX means React escapes it (threat T-U1N-01): no dangerouslySetInnerHTML, no
          string-built markup. */}
      <div
        data-print-only
        className={cn(
          "hidden min-h-[360px] min-w-0 flex-col rounded-xl border border-[#e4ddc9] p-1.5",
          BOARD_NAME_GRID_PLACEMENT,
        )}
      >
        <div className="mb-1 flex-none text-[12px] font-extrabold tracking-[1px] text-outline-accent uppercase">
          Board Name
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center text-[22px] leading-[1.2] font-extrabold whitespace-pre-wrap text-outline-ink">
          {boardName}
        </div>
      </div>
    </div>
  );
}
