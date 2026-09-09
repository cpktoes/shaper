"use client";

import type { ReactNode } from "react";

/**
 * The one layout every design screen (TEMPLATE, ROCKER, RAILS, VOLUME, FINS) is built on: a
 * control sidebar beside a drawing on a desktop screen, and the same two pieces stacked — drawing
 * pinned across the top, controls scrolling beneath it — on a phone. Before this component the
 * sidebar-beside-canvas layout was hand-copied into all five editors with zero breakpoints, so
 * fixing the phone layout meant fixing it five times. Now it is written once here, and a desktop
 * shaper sees byte-for-byte what they always have: every phone rule below is an ADDITIVE
 * `max-shell:` override layered on the unprefixed desktop base, gated on the `--breakpoint-shell`
 * token declared in `app/globals.css` — never a second branch, never a default flip a desktop
 * mouse could ever trigger.
 *
 * Two structural exceptions this file must never lose, because they are what let RAILS and FINS
 * fit the same shell without editing it:
 *   - `printHide` puts `data-print-hide` on the root, so a screen whose own print path lives
 *     outside this shell (RAILS' View Full Sized dialog) can hide the whole shell from paper.
 *   - `outsideColumns` renders as a SIBLING of the two-column root, not inside either column — for
 *     content that must not be clipped or scrolled by either the sidebar or the canvas (FINS'
 *     ToeAimTableModal).
 *
 * `phonePinned` decides how tall the pinned drawing area may grow on a phone before the controls
 * take the rest of the screen as the page's one scroller; `"none"` means there is nothing to pin
 * at all (VOLUME, the RAILS INSTRUCTIONS tab) and the whole shell becomes one vertical scroller
 * instead, with the drawing (or read-only content) simply first in that scroll order.
 */

export type PhonePinned = "66dvh" | "55dvh" | "50dvh" | "none";

export interface DesignScreenShellProps {
  /** The sidebar body — a screen's own control column (sliders, typed fields, toggles). */
  controls: ReactNode;
  /** The main working area — normally a `TabbedPanel` wrapping the screen's drawing. */
  canvas: ReactNode;
  /** Hides the sidebar entirely so `canvas` gets the full width. Outline/rocker only. */
  wideView?: boolean;
  /** The dev-only "Copy preset values" row, pinned below the scrolling controls. */
  sidebarFooter?: ReactNode;
  /** Content rendered as a sibling of the two-column root — FINS' `ToeAimTableModal`. */
  outsideColumns?: ReactNode;
  /** Sets `data-print-hide` on the root — RAILS, whose own print path lives outside this shell. */
  printHide?: boolean;
  /** VOLUME's aside: one scrolling box with no inner scroll div and no dev footer. */
  simpleSidebar?: boolean;
  /** How tall the pinned drawing may grow on a phone, or `"none"` for a single scrolling column. */
  phonePinned?: PhonePinned;
}

/**
 * Tailwind cannot see an interpolated class name, so the pinned-height class for each
 * `phonePinned` value is a complete literal string here, never built by concatenation.
 */
const PHONE_PINNED_MAX_HEIGHT_CLASS: Record<Exclude<PhonePinned, "none">, string> = {
  "66dvh": "max-shell:max-h-[66dvh]",
  "55dvh": "max-shell:max-h-[55dvh]",
  "50dvh": "max-shell:max-h-[50dvh]",
};

export function DesignScreenShell({
  controls,
  canvas,
  wideView = false,
  sidebarFooter,
  outsideColumns,
  printHide = false,
  simpleSidebar = false,
  phonePinned = "66dvh",
}: DesignScreenShellProps) {
  const nonePinned = phonePinned === "none";

  const rootClassName = nonePinned
    ? "flex min-h-0 w-full flex-1 flex-nowrap max-shell:flex-col max-shell:overflow-y-auto"
    : "flex min-h-0 w-full flex-1 flex-nowrap max-shell:flex-col";

  const asideClassName = simpleSidebar
    ? nonePinned
      ? "h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] overflow-y-auto border-r border-surf-line-faint bg-surf-sidebar p-10 text-surf-ink " +
        "max-shell:order-last max-shell:h-auto max-shell:flex-none max-shell:w-full max-shell:max-w-none max-shell:basis-auto max-shell:border-r-0 max-shell:border-t max-shell:overflow-visible"
      : "h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] overflow-y-auto border-r border-surf-line-faint bg-surf-sidebar p-10 text-surf-ink " +
        "max-shell:order-last max-shell:h-auto max-shell:w-full max-shell:max-w-none max-shell:basis-auto max-shell:border-r-0 max-shell:border-t"
    : nonePinned
      ? "flex h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] flex-col border-r border-surf-line-faint bg-surf-sidebar text-surf-ink " +
        "max-shell:order-last max-shell:h-auto max-shell:min-h-0 max-shell:flex-none max-shell:w-full max-shell:max-w-none max-shell:basis-auto max-shell:border-r-0 max-shell:border-t max-shell:overflow-visible"
      : "flex h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] flex-col border-r border-surf-line-faint bg-surf-sidebar text-surf-ink " +
        "max-shell:order-last max-shell:h-auto max-shell:min-h-0 max-shell:flex-1 max-shell:w-full max-shell:max-w-none max-shell:basis-auto max-shell:border-r-0 max-shell:border-t max-shell:overflow-y-auto";

  const controlsScrollClassName = "min-h-0 flex-1 overflow-y-auto p-10 max-shell:p-4";

  const mainBase = wideView
    ? "flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-1"
    : "flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-3";

  const mainPhone = nonePinned
    ? "max-shell:order-first max-shell:flex-none max-shell:basis-auto max-shell:p-2 max-shell:h-auto max-shell:overflow-visible"
    : `max-shell:order-first max-shell:flex-none max-shell:basis-auto max-shell:p-2 ${PHONE_PINNED_MAX_HEIGHT_CLASS[phonePinned]}`;

  const mainClassName = `${mainBase} ${mainPhone}`;

  return (
    <div className={rootClassName} data-print-hide={printHide ? true : undefined}>
      {!wideView && (
        // `data-design-controls-scroll` is a test-only hook — a stable, pixel-inert Playwright
        // locator, the same idiom as `data-drag-target` on the outline/rocker viewers — placed on
        // whichever element is the actual scrolling box: the aside itself in `simpleSidebar` mode
        // (VOLUME has no inner scroll div), the inner div otherwise.
        <aside className={asideClassName} data-design-controls-scroll={simpleSidebar ? true : undefined}>
          {simpleSidebar ? (
            controls
          ) : (
            <>
              <div data-design-controls-scroll className={controlsScrollClassName}>
                {controls}
              </div>
              {sidebarFooter}
            </>
          )}
        </aside>
      )}
      <main className={mainClassName}>{canvas}</main>
      {outsideColumns}
    </div>
  );
}
