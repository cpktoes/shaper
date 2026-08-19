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
 */

import { useEffect, useRef } from "react";

const PAGE_W = 1030;
const PAGE_H = 750;

export function useSummaryPrintFit() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const beforePrint = () => {
      const el = rootRef.current;
      if (!el) return;
      // Releases the fixed on-screen height so the grid can grow to its natural size — the CSS
      // rule this attribute triggers lives in app/design/summary/summary.css.
      el.setAttribute("data-printing", "true");
      // Reading scrollWidth/scrollHeight after setting the attribute forces the reflow that
      // makes them reflect the now-unfixed layout; no extra measuring pass needed.
      const w = el.scrollWidth;
      const h = el.scrollHeight;
      const rawScale = Math.min(1, PAGE_W / w, PAGE_H / h);
      const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;
      el.style.zoom = String(scale);
    };

    const afterPrint = () => {
      const el = rootRef.current;
      if (!el) return;
      el.removeAttribute("data-printing");
      el.style.zoom = "";
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
