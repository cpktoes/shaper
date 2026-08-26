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
}) {
  const interactive = typeof onSelect === "function" && tabs.length > 1;

  return (
    <>
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

      {/* Square top-left so it meets the first tab flush; `-mt-px` closes the seam the tab's
          missing bottom border leaves. */}
      <div className="flex min-h-0 flex-1 flex-col rounded-tr-lg rounded-b-lg border border-surf-line bg-surf-tab-active p-3 -mt-px">
        {/* The content's own card. Two nested boundaries doing different jobs: the panel's
            `--surf-line` edge says where the working surface starts, and this fainter,
            fully-rounded one says where the content sits inside it. `line-faint` is right here
            precisely because it should recede — it is a grouping hint, not a structural edge,
            and it reads against `panel` rather than against the canvas. The 12px inset (`p-3`)
            lives here on purpose, so every screen and every tab gets one treatment from one
            place instead of each call site arriving at it (or not) on its own. */}
        <div
          className={cn("flex min-h-0 flex-1 flex-col rounded-lg border border-surf-line-faint bg-surf-panel p-3", panelClassName)}
        >
          {children}
        </div>
      </div>
    </>
  );
}
