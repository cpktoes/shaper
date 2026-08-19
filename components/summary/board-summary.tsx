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
import { cn } from "@/lib/utils";

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
  const { outline, outlineGeometry, finPlacement } = useDesign();

  return (
    <div
      data-summary-root
      className={cn(
        "grid min-h-0 flex-1 grid-cols-1 auto-rows-auto gap-2 overflow-y-auto bg-outline-page-bg p-2",
        "min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] min-[900px]:grid-rows-[85fr_15fr] min-[900px]:overflow-hidden",
      )}
    >
      {/* Rail Data — Task 2 fills the body. */}
      <SummaryCard
        title="Rail Data"
        className="order-3 min-h-[360px] min-[900px]:order-none min-[900px]:col-start-1 min-[900px]:row-start-1 min-[900px]:min-h-0"
      />

      {/* Template — the tracer panel, live from the shared store. */}
      <SummaryCard
        title="Template"
        variant="flush"
        className="order-1 min-h-[360px] min-[900px]:order-none min-[900px]:col-start-2 min-[900px]:row-start-1 min-[900px]:min-h-0"
      >
        <div className="relative flex h-full w-full justify-center">
          <div className="relative aspect-[340/620] h-full max-w-full">
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

      {/* Volume Estimate + Fin Placement — one flex column, Task 2 fills both bodies. */}
      <div className="order-4 flex min-h-[360px] flex-col gap-2 min-[900px]:order-none min-[900px]:col-start-3 min-[900px]:row-start-1 min-[900px]:min-h-0">
        <SummaryCard title="Volume Estimate" className="flex-1 min-h-0" />
        <SummaryCard title="Fin Placement" variant="flush" className="flex-1 min-h-0" />
      </div>

      {/* Rail Plots — spans the first two columns at 900px and up. Task 2 fills the body. */}
      <SummaryCard
        title="Rail Plots"
        variant="flush"
        className="order-2 min-h-[220px] min-[900px]:order-none min-[900px]:col-start-1 min-[900px]:col-span-2 min-[900px]:row-start-2 min-[900px]:min-h-0"
      />

      {/* Board Name — Task 3 wires the store, the print-only twin and the print-fit hook. */}
      <SummaryCard
        title="Board Name"
        className="order-5 min-h-[360px] min-[900px]:order-none min-[900px]:col-start-3 min-[900px]:row-start-2 min-[900px]:min-h-0"
      />
    </div>
  );
}
