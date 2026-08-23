"use client";

/**
 * The Summary screen's print-fit: scales the whole grid down with CSS `zoom` so it lands on one
 * landscape page, ported from Summary.dc.html's `onBeforePrint`/`onAfterPrint` (lines 94-105) and
 * `printZoom` (line 164).
 *
 * The browser snapshots the page as soon as the `beforeprint` handler returns. A React state
 * update scheduled inside that handler is asynchronous and is not guaranteed to have committed by
 * then, so the measured scale could miss the printed page entirely. Everything that must be true
 * at snapshot time is therefore either pure CSS (`@media print`, which the browser applies
 * natively) or set directly on the node inside the handler — this hook works imperatively on the
 * DOM element and sets no React state, on purpose, even though that looks like a React
 * anti-pattern at a glance.
 *
 * Two things this originally got wrong, both of which put the sheet onto a second page:
 *
 * 1. **The page box was a magic number** (1030x750 CSS px), taller than either paper it had to fit:
 *    a US Letter landscape page at 0.4in margins is 979x739 and A4 landscape is 1045x717, so the
 *    sheet overflowed by 11px and 33px respectively. The margins were not pinned either, so the
 *    real printable area moved with whatever was set in the print dialog. Both are now derived —
 *    the margin is declared in `app/design/summary/summary.css` and mirrored here, and the target is
 *    the smaller of Letter and A4 on each axis so the sheet fits whichever paper the printer holds.
 *
 * 2. **It measured the wrong layout.** `beforeprint` fires before the browser relays out for print,
 *    so `scrollHeight` described the grid at the *window's* width. The page prints at about 995px,
 *    where the same grid reflows taller — and from a narrow window the summary is a tall single
 *    column on screen, nothing like what prints. The handler now pins the root to the printable
 *    width before measuring, so the layout it measures is the layout that prints.
 */

import { useEffect, useRef } from "react";

/** Must match the `@page` margin declared in `app/design/summary/summary.css`. */
const PAGE_MARGIN_MM = 8;
const MM_PER_INCH = 25.4;

/**
 * Landscape paper, in inches. The sheet has to fit whichever of these the shaper's printer holds,
 * so the target below takes the smaller of the two on each axis — Letter is the narrower, A4 the
 * shorter.
 */
const LANDSCAPE_PAPER_IN = [
  { width: 11, height: 8.5 }, // US Letter
  { width: 11.69, height: 8.27 }, // A4
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
  const widthIn = Math.min(...LANDSCAPE_PAPER_IN.map((p) => p.width)) - 2 * marginIn;
  const heightIn = Math.min(...LANDSCAPE_PAPER_IN.map((p) => p.height)) - 2 * marginIn;
  return { width: widthIn * pxPerInch, height: heightIn * pxPerInch };
}

export function useSummaryPrintFit() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const beforePrint = () => {
      const el = rootRef.current;
      if (!el) return;
      // Releases the fixed on-screen height so the grid can grow to its natural size — the CSS
      // rule this attribute triggers lives in app/design/summary/summary.css.
      el.setAttribute("data-printing", "true");

      const page = printableBoxPx();

      // Hand the grid the page box outright — both axes — rather than letting it size itself and
      // then scaling the result down.
      //
      // The difference matters because the grid's rows are `fr`. Given a definite height they
      // divide it, exactly as they do on screen. Left to size themselves they become
      // content-proportional instead, so the single tallest card sets the unit and every other row
      // inflates with it: the sheet came out around 1040px tall against a 756px page and had to be
      // scaled to 0.70, printing at 70% of the page width with a third of the sheet left blank.
      // Sized to the page, the layout that prints is the one the design was drawn for.
      el.style.width = `${page.width}px`;
      el.style.height = `${page.height}px`;

      // Guard for content that genuinely cannot compress into its cell — a long rail table on a
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

  const printSummary = () => window.print();

  return { rootRef, printSummary };
}
