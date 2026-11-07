import type { Page } from "@playwright/test";
import { PREVIEW_CAPTURE } from "../../lib/link-preview/preview-image";

/**
 * Takes the development server's corner badge off this page, on every load from here on. The badge
 * belongs to `next dev` and never reaches the live site. At rest it is a 36-dot circle in the
 * bottom-left corner, but each time the page renders it stretches to about 115 dots for a moment,
 * which on a phone is right across Open This Board. A press that came down on the button and lifted
 * on the stretched badge clicked neither, so the button did nothing (found 2026-11-05). Playwright
 * checks what is under the point before it presses, never between the press and the lift, so it
 * can't see this coming. A style sheet added this way puts nothing in the page for React to trip over.
 */
export async function hideDevBadge(page: Page): Promise<void> {
  await page.addInitScript((css) => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }, PREVIEW_CAPTURE.hideDevIndicatorCss);
}
