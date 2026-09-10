"use client";

/**
 * The order form's print-fit: hands **every sheet** the printable page box and, if one still
 * overflows, scales that sheet down with CSS `zoom` so it lands on a single **portrait** page.
 *
 * The form is two pages — the order form and the shaper's reference — so the element this hook is
 * attached to is no longer a page, it is the stack of them. Each sheet is sized and measured
 * independently: a long rail table on page 2 must not shrink page 1's drawings, which is exactly
 * what would happen if one scale were computed across the pair.
 *
 * The browser snapshots the page as soon as the `beforeprint` handler returns. A React state
 * update scheduled inside that handler is asynchronous and is not guaranteed to have committed by
 * then, so the measured scale could miss the printed page entirely. Everything that must be true
 * at snapshot time is therefore either pure CSS (`@media print`, which the browser applies
 * natively) or set directly on the node inside the handler — this hook works imperatively on the
 * DOM element and sets no React state, on purpose, even though that looks like a React
 * anti-pattern at a glance.
 *
 * Three things this originally got wrong, all of which put a sheet onto the wrong page, and all
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
 *
 * 3. **Letter's own slack was never budgeted.** `printableBoxPx()` above fits every sheet to the
 *    smaller of Letter and A4 on each axis, and on height that smaller value is Letter's — 11in
 *    less two 8mm margins, about 995.6px at 96dpi. `FIT_SAFETY` shaves a hair off that for the
 *    fitted sheet itself, which leaves only about five pixels of slack once a sheet is sized to
 *    the box. **Anything else in the printed page's own flow, above or below the sheets, costs a
 *    whole page** — five pixels is nowhere near enough room to absorb it. That is what
 *    `order-form.css`'s own screen padding on the page wrapper did before G-08-10 fixed it (32px
 *    of "desk" above and below the paper, invisible on A4's roomier 1061px but enough on Letter
 *    to push sheet 1 onto its own page and spill a blank page after the last sheet), and it is
 *    the same reason the sign-in banner had to carry `data-print-hide` off the printed rails
 *    dialog page in plan 08-07 — neither is a sheet, so neither gets any of this budget.
 *
 * **`order-form.css` is now the source of truth for the printed sheet's size, not this handler.**
 * Its `@media print` block declares the root's and every sheet's width and height as a plain CSS
 * fact in paper units, built from these same four constants (`PAGE_MARGIN_MM`, `PORTRAIT_PAPER_IN`,
 * `FIT_SAFETY`) arranged the same way — so that fact holds the instant print media applies, before
 * this handler, or any JavaScript, has run. This handler's inline `width`/`height` writes below now
 * exist for one remaining reason: forcing the printing layout into existence so `scrollHeight`
 * measures the layout that actually prints, rather than the window's. This handler's own decision
 * is the `zoom` overflow guard in point 2 above, and nothing else about the sheet's size.
 *
 * **What actually went wrong on a phone, corrected against the founder's own iPhone prints
 * (260910-2ny-PROBE-READING.md, 260910-2ny-PROBE-READING-2.md).** This handler runs on iOS Safari
 * exactly as it does on a computer, and its writes reach the print snapshot there too — the
 * stylesheet's own declarations apply on both. What went wrong was the BOX, twice. The first fix
 * gave a touch device a shorter, paper-SHAPED sheet but left its WIDTH an absolute inch figure —
 * and the founder's second print showed that was the actual failure: the identical 7.640in of CSS
 * width printed at 8.758in before that fix and 8.719in after it, so iOS Safari does not honour an
 * absolute inch width at all. So a touch device's sheet now takes its width from the page and its
 * shape from `order-form.css`'s `aspect-ratio`, and this handler writes NOTHING at all on that
 * path — there is no target width to pin, since the whole fix is that the page decides it.
 * `components/summary/order-form-print.test.ts` fails the moment the two files drift: the phone
 * rule's shape must stay tied to `PORTRAIT_PAPER_IN`, and neither touch rule may carry an absolute
 * length.
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

/** Written on `[data-order-form-root]` at mount when the pointer is coarse, and read by
 * `order-form.css`'s phone-only sheet rule — the one place both files agree on the attribute's
 * name. */
const TOUCH_PRINT_ATTRIBUTE = "data-print-touch";

/** Pointer, not width (260910-2ny): in PRINT media a width query tests the PAGE, not the screen,
 * so a width condition would match on a computer and wreck the desktop box D-01 protects. An iPad
 * is also a coarse pointer on a wide screen running the same WebKit print path as an iPhone, so a
 * width condition would exclude precisely the device that most needs this fix. Read once, here, in
 * SCREEN media at mount, where `pointer` has a well-defined meaning — a printer has no pointer to
 * ask about. */
const COARSE_POINTER_QUERY = "(pointer: coarse)";

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

  // Decide the touch attribute from the POINTER, at mount, in screen media — not in `beforePrint`,
  // where a printer has no pointer to ask about, and not from a width, which a print query would
  // read against the page rather than the screen (see TOUCH_PRINT_ATTRIBUTE / COARSE_POINTER_QUERY
  // above). Follows the query's own `change` event so a tablet that gains a mouse mid-session does
  // not keep a stale attribute into its next print.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window.matchMedia !== "function") return;

    const query = window.matchMedia(COARSE_POINTER_QUERY);
    const applyTouchAttribute = () => {
      if (query.matches) {
        root.setAttribute(TOUCH_PRINT_ATTRIBUTE, "true");
      } else {
        root.removeAttribute(TOUCH_PRINT_ATTRIBUTE);
      }
    };

    applyTouchAttribute();
    query.addEventListener("change", applyTouchAttribute);
    return () => query.removeEventListener("change", applyTouchAttribute);
  }, []);

  useEffect(() => {
    const sheetsOf = (root: HTMLElement) =>
      Array.from(root.querySelectorAll<HTMLElement>("[data-order-form-sheet]"));

    const beforePrint = () => {
      const root = rootRef.current;
      if (!root) return;
      // Releases the on-screen stacking — the gap between sheets, the aspect-ratio that shapes them
      // on screen — so each page is sized by the box below instead. The CSS rules this attribute
      // triggers live in app/design/summary/order-form.css.
      root.setAttribute("data-printing", "true");

      // The handler deliberately does nothing else on the touch path (260910-2ny). Read the
      // attribute the mount effect already wrote above — never the pointer media query a second
      // time — and return immediately if it is present. Three reasons, all short: there is no
      // target width to pin, since the whole fix is that the page decides it; pinning one in
      // pixels here would re-impose from inside the app the exact absolute width iOS refuses to
      // honour, undoing the fix invisibly; and nothing measurable could come of running on anyway
      // — `beforeprint` fires in screen media, and the print layout width on the touch path is a
      // number only the printer knows. With no `zoom` guard running there, the unconditional
      // `overflow: hidden` backstop in order-form.css is what catches content that cannot
      // compress, and e2e/summary-print-touch-box.spec.ts is what proves it never has to.
      if (root.hasAttribute(TOUCH_PRINT_ATTRIBUTE)) return;

      const page = printableBoxPx();

      // Pin the ROOT to the printable width as well, not just the sheets. Desktop-only from here
      // down — the touch path already returned above.
      //
      // The root is the `@container` every `cqw` font size on the sheet resolves against (see
      // order-form.css). Sizing only the sheets leaves it at whatever width the print viewport
      // happens to hand it, so the type would print at a size neither the design nor the
      // measurement below ever saw — and if that came out larger, the overflow guard would answer
      // by zooming the sheet down, dragging the type back under the 9pt floor it is supposed to
      // hold. Pinned, the container query resolves to the printed width, and the layout measured
      // here is the layout that prints.
      root.style.width = `${page.width}px`;

      // A hair under the page box, not exactly it. A sheet sized to the page's precise height is
      // one sub-pixel rounding error away from "does not fit", and with `break-inside: avoid` on
      // it the browser answers that by pushing the whole sheet onto the next page — turning two
      // pages into four, half of them blank. The shave is well under a printed millimetre.
      const sheetHeight = page.height * FIT_SAFETY;

      for (const sheet of sheetsOf(root)) {
        // Hand each sheet the page box outright — both axes — rather than letting it size itself
        // and then scaling the result down.
        //
        // The difference matters because a sheet's bands are `fr`. Given a definite height they
        // divide it, exactly as they do on screen. Left to size themselves they become
        // content-proportional instead, so the single tallest band sets the unit and every other
        // row inflates with it. Sized to the page, the layout that prints is the one it was drawn
        // for.
        sheet.style.width = `${page.width}px`;
        sheet.style.height = `${sheetHeight}px`;

        // Guard for content that genuinely cannot compress into its band — a long rail table on a
        // small page. `scrollHeight` still reports the overflow even with the box clipped, so this
        // catches it and falls back to scaling that sheet. Per sheet, not across the pair: page 2
        // overflowing is no reason to shrink page 1's drawings.
        const overflow = sheet.scrollHeight - sheetHeight;
        const scale = overflow > 1 ? sheetHeight / sheet.scrollHeight : 1;
        sheet.style.zoom = String(Number.isFinite(scale) && scale > 0 ? scale : 1);
      }
    };

    const afterPrint = () => {
      const root = rootRef.current;
      if (!root) return;
      root.removeAttribute("data-printing");
      root.style.width = "";
      for (const sheet of sheetsOf(root)) {
        sheet.style.zoom = "";
        sheet.style.width = "";
        sheet.style.height = "";
      }
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
