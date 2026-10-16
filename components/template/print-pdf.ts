/**
 * Prints a finished template PDF instead of downloading it (fast task, 2026-10-15, the founder:
 * "print the output rather than force a download. The user can save to PDF if they want. But
 * everything else on the app prints rather than downloads"). The print window's own "Save as PDF"
 * is how a shaper keeps a file.
 *
 * Three paths, chosen by the device in hand — the pointer, and Android — never by the layout (CLAUDE.md):
 * - **A mouse or trackpad** gets the browser's print window straight away: the PDF loads into an
 *   invisible frame on this page and that frame prints itself, the way the order form's Print
 *   button prints the page.
 * - **A finger on an iPhone or iPad** gets the PDF opened in a new tab: Safari cannot print a PDF
 *   from inside a page (it prints only the page around it), so the tab is where it prints from —
 *   Share → Print. That tab must be opened inside the tap itself or the browser blocks it, which is
 *   why `openPrintTab` runs before the PDF is built and `printPdf` fills it afterwards.
 * - **Android** cannot show a PDF in a browser tab at all — Chrome downloads it instead and leaves
 *   the tab blank — so there the PDF downloads, exactly as before, and prints from the phone's own
 *   PDF viewer.
 *
 * If the browser refuses the tab anyway, the PDF downloads too, so a shaper never ends up with
 * nothing.
 */

import type jsPDF from "jspdf";

/** Marks the invisible print frame, so the next print replaces it and a test can find it. */
export const PRINT_FRAME_ATTRIBUTE = "data-print-pdf";

/** How long a finished PDF's address is kept for the tab that shows it before it is let go. */
const TAB_URL_LIFETIME_MS = 60_000;

/** True on a finger — the PDF opens in a tab (or, on Android, downloads) rather than printing in place. */
function printsInTab(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
}

/** True on Android, whose browser downloads a PDF rather than showing it in a tab. */
function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Opens the empty tab a finger's PDF will show in — call it inside the tap's own handler, before the
 * PDF is built. Returns `null` on a mouse or trackpad, where nothing opens, and `null` when the
 * browser blocks the tab.
 */
export function openPrintTab(): Window | null {
  if (!printsInTab() || isAndroid()) return null;
  return window.open("", "_blank");
}

/**
 * Prints `doc`: into `tab` when one was opened for a finger, otherwise through an invisible frame on
 * this page. `fileName` names the PDF (its title, which the print window's "Save as PDF" offers as the
 * name) and the download Android gets, or a finger's blocked tab falls back to.
 */
export function printPdf(doc: jsPDF, fileName: string, tab: Window | null): void {
  doc.setDocumentProperties({ title: fileName.replace(/\.pdf$/i, "") });

  if (printsInTab()) {
    if (!tab || tab.closed) {
      doc.save(fileName);
      return;
    }
    const url = URL.createObjectURL(doc.output("blob"));
    tab.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), TAB_URL_LIFETIME_MS);
    return;
  }

  for (const old of document.querySelectorAll<HTMLIFrameElement>(`iframe[${PRINT_FRAME_ATTRIBUTE}]`)) {
    URL.revokeObjectURL(old.src);
    old.remove();
  }
  const url = URL.createObjectURL(doc.output("blob"));
  const frame = document.createElement("iframe");
  frame.setAttribute(PRINT_FRAME_ATTRIBUTE, "");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.title = fileName;
  // Not zero-sized and not display:none: Firefox and Chrome leave a PDF unloaded in a frame they
  // consider invisible, and it then prints blank. A 1-dot-wide, fully transparent frame is laid out.
  frame.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:100px;opacity:0;border:0;margin:0;padding:0;pointer-events:none";
  frame.addEventListener("load", () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  });
  frame.src = url;
  document.body.appendChild(frame);
}
