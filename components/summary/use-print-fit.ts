"use client";

/**
 * The order form's print-fit: hands the sheet the printable page box and, if anything still
 * overflows, scales the whole thing down with CSS `zoom` so it lands on one **portrait** page.
 *
 * The browser snapshots the page as soon as the `beforeprint` handler returns. A React state
 * update scheduled inside that handler is asynchronous and is not guaranteed to have committed by
 * then, so the measured scale could miss the printed page entirely. Everything that must be true
 * at snapshot time is therefore either pure CSS (`@media print`, which the browser applies
 * natively) or set directly on the node inside the handler — this hook works imperatively on the
 * DOM element and sets no React state, on purpose, even though that looks like a React
 * anti-pattern at a glance.
 *
 * Two things this originally got wrong, both of which put the sheet onto a second page, and both
 * of which the derivation below exists to prevent:
 *
 * 1. **The page box was a magic number**, taller than either paper it had to fit, and the margins
 *    were not pinned either — so the real printable area moved with whatever was set in the print
 *    dialog. Both are now derived: the margin is declared in `app/design/summary/order-form.css`
 *    and mirrored here, and the target is the smaller of Letter and A4 on each axis so the sheet
 *    fits whichever paper the printer holds.
 *
 * 2. **It measured the wrong layout.** `beforeprint` fires before the browser relays out for
 *    print, so `scrollHeight` described the sheet at the *window's* width — and from a narrow
 *    window that is nothing like what prints. The handler pins the root to the printable width
 *    before measuring, so the layout it measures is the layout that prints.
 */

import { useEffect, useRef } from "react";

/** Must match the `@page` margin declared in `app/design/summary/order-form.css`. */
const PAGE_MARGIN_MM = 8;
const MM_PER_INCH = 25.4;

/**
 * Portrait paper, in inches. The sheet has to fit whichever of these the shaper's printer holds,
 * so the target below takes the smaller of the two on each axis — Letter is the shorter, A4 the
 * narrower.
 */
const PORTRAIT_PAPER_IN = [
  { width: 8.5, height: 11 }, // US Letter
  { width: 8.27, height: 11.69 }, // A4
];

/**
 * A hair off the computed box. Printer page boxes are fractional and the browser rounds; landing
 * exactly on the boundary is what a second page is made of.
 */
const FIT_SAFETY = 0.995;

/** CSS px per inch, measured rather than assumed — a zoomed or high-DPI context is not 96. */
function measurePxPerInch(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "width:1in;height:0;position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px > 0 ? px : 96;
}

function printableBoxPx(): { width: number; height: number } {
  const pxPerInch = measurePxPerInch();
  const marginIn = PAGE_MARGIN_MM / MM_PER_INCH;
  const widthIn = Math.min(...PORTRAIT_PAPER_IN.map((p) => p.width)) - 2 * marginIn;
  const heightIn = Math.min(...PORTRAIT_PAPER_IN.map((p) => p.height)) - 2 * marginIn;
  return { width: widthIn * pxPerInch, height: heightIn * pxPerInch };
}

export function useOrderFormPrintFit() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const beforePrint = () => {
      const el = rootRef.current;
      if (!el) return;
      // Releases the fixed on-screen height so the sheet can grow to its natural size — the CSS
      // rule this attribute triggers lives in app/design/summary/order-form.css.
      el.setAttribute("data-printing", "true");

      const page = printableBoxPx();

      // Hand the sheet the page box outright — both axes — rather than letting it size itself and
      // then scaling the result down.
      //
      // The difference matters because the sheet's rows are `fr`. Given a definite height they
      // divide it, exactly as they do on screen. Left to size themselves they become
      // content-proportional instead, so the single tallest band sets the unit and every other row
      // inflates with it. Sized to the page, the layout that prints is the one it was drawn for.
      el.style.width = `${page.width}px`;
      el.style.height = `${page.height}px`;

      // Guard for content that genuinely cannot compress into its band — a long rail table on a
      // small page. `scrollHeight` still reports the overflow even with the box clipped, so this
      // catches it and falls back to scaling the whole sheet.
      const overflow = el.scrollHeight - page.height;
      const scale = overflow > 1 ? (page.height * FIT_SAFETY) / el.scrollHeight : 1;
      el.style.zoom = String(Number.isFinite(scale) && scale > 0 ? scale : 1);
    };

    const afterPrint = () => {
      const el = rootRef.current;
      if (!el) return;
      el.removeAttribute("data-printing");
      el.style.zoom = "";
      el.style.width = "";
      el.style.height = "";
    };

    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  const printOrderForm = () => window.print();

  return { rootRef, printOrderForm };
}
