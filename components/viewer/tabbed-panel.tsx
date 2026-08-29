"use client";

/**
 * The folder-tab-and-panel treatment every design screen's working area uses.
 *
 * Said once rather than six times. Four screens need it and two of them (Template, Volume)
 * have only one region to show — copying the markup a fifth and sixth time is exactly how a
 * treatment drifts, which this codebase has already been bitten by (see the `.slider-accent`
 * note in app/globals.css, written after fourteen copies of a slider style).
 *
 * The shape: a strip of tabs sitting ON the canvas, and a bordered panel below that picks up
 * the line the active tab drops. The active tab sets `border-b-0` and the panel is pulled up
 * a pixel, so the two read as one continuous surface — that is the whole point of the
 * treatment, and it is why the panel has to exist. Before it did, the active tab was a
 * floating chip with an open bottom edge.
 *
 * The edge uses `--surf-line`, not `--surf-line-faint`. A panel boundary is structural: it
 * says where the working surface starts. `line-faint` is 1.22:1 against Daylight's canvas —
 * present in the DOM and invisible on screen. `line` is the token that carries the 3:1
 * non-text target, which is what a boundary like this needs to survive every theme rather
 * than only the high-contrast ones.
 *
 * The tab label deliberately carries the app's heading treatment — small, all-caps,
 * architecturally tracked — the same as the menu bar links and the sidebar section headings,
 * so a later editor should not "correct" it back toward body type.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelTab<T extends string> {
  id: T;
  label: string;
}

export function TabbedPanel<T extends string>({
  tabs,
  active,
  onSelect,
  children,
  panelClassName = "",
  bare = false,
}: {
  tabs: readonly PanelTab<T>[];
  active: T;
  /**
   * Omit on a single-tab screen. Without it the tab renders as a plain element rather than a
   * `<button>` — a control that controls nothing is worse than a label, both for a pointer
   * and for anyone arrowing through with a screen reader.
   */
  onSelect?: (id: T) => void;
  children: ReactNode;
  /**
   * Extra classes for the inner content card — layout only; surface and edges are fixed
   * here. The card carries a default 12px inset (`p-3`); classes here merge through `cn`
   * (tailwind-merge), so a caller's own padding deterministically overrides the default
   * rather than depending on Tailwind's stylesheet order.
   */
  panelClassName?: string;
  /**
   * Drops the tab strip and the outer card layer, leaving just the inner content card wrapping
   * `children` directly (WR-02). Exists for a caller that toggles between a tabbed and a
   * chrome-free presentation of the SAME content at the same tree position — Outline's Wide
   * View toggle used to swap between `<TabbedPanel>` and a plain `<div>` there, and because
   * those are different element types React's reconciler tore down and rebuilt the whole
   * subtree (the drawing, its drag state, the toolbar buttons) on every toggle. Rendering
   * `<TabbedPanel bare={wideView}>` instead keeps the SAME component at that position always;
   * the panel div below carries an explicit `key` so its identity survives the tab strip
   * appearing/disappearing beside it, and `children`'s own position relative to that div never
   * changes shape either way — only its surrounding classes do.
   */
  bare?: boolean;
}) {
  const interactive = typeof onSelect === "function" && tabs.length > 1;

  return (
    <>
      {!bare && (
        <div className="flex flex-none gap-1.5" role={interactive ? "tablist" : undefined}>
          {tabs.map((tab) => {
            const on = tab.id === active;
            const className =
              "rounded-t-lg border px-[18px] py-1.5 text-xs font-display font-bold tracking-architectural uppercase " +
              (on
                ? "border-surf-line border-b-0 bg-surf-tab-active text-surf-ink"
                : "border-transparent bg-transparent text-surf-ink-muted");

            if (!interactive) {
              return (
                <span key={tab.id} className={className}>
                  {tab.label}
                </span>
              );
            }
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onSelect?.(tab.id)}
                className={`cursor-pointer ${className}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* `key="panel"` so this div (and everything inside it, including `children`) keeps its
          identity across a `bare` toggle even though the tab strip above it appears or
          disappears — without an explicit key, React reconciles fragment children positionally,
          and losing/gaining that first sibling would otherwise shift this div's index and read
          as a different node. In non-bare mode this div carries the outer card's border and is
          square top-left so it meets the first tab flush, with `-mt-px` closing the seam the
          tab's missing bottom border leaves. In `bare` mode there is no tab strip and no seam to
          close, so this layer is deliberately unstyled — a plain flex pass-through with no
          border, background, or padding of its own — so the SINGLE visible box a shaper sees in
          Wide View is the inner card below, not this one. */}
      <div
        key="panel"
        className={
          bare
            ? "flex min-h-0 flex-1 flex-col"
            : "flex min-h-0 flex-1 flex-col rounded-tr-lg rounded-b-lg border border-surf-line bg-surf-tab-active p-3 -mt-px"
        }
      >
        {/* The content's own card. In non-bare mode these are two nested boundaries doing
            different jobs: the panel's `--surf-line` edge above says where the working surface
            starts, and this fainter, fully-rounded one says where the content sits inside it.
            `line-faint` is right here precisely because it should recede — it is a grouping
            hint, not a structural edge, and it reads against `panel` rather than against the
            canvas. The 12px inset (`p-3`) lives here on purpose, so every screen and every tab
            gets one treatment from one place instead of each call site arriving at it (or not)
            on its own. In `bare` mode the outer layer above is invisible, so THIS card takes
            the full `--surf-line` border and the tighter 4px inset (`p-1`) Wide View asks for —
            matching, pixel for pixel, the single bordered box the plain `<div>` this replaced
            used to draw. */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col rounded-lg border bg-surf-panel",
            bare ? "border-surf-line p-1" : "border-surf-line-faint p-3",
            panelClassName,
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}
