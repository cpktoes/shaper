/**
 * Re-runnable capture for the app's link-preview picture (quick 260930-fjm, Phase 13 item 12,
 * Task 1). Drives a RUNNING dev server with Playwright, following the founder's option A recipe
 * exactly (F-1, `PREVIEW_CAPTURE` in `lib/link-preview/preview-image.ts`), downscales the result
 * in Chromium with no new dependency (P-8), and writes both `app/opengraph-image.png` and
 * `app/opengraph-image.alt.txt`.
 *
 * Run it with `npm run preview:capture` against a plain `npx next dev -p 3111` — never
 * Playwright's own webServer (P-7). Playwright's webServer injects fake Clerk keys for the
 * browser suite, and under them Clerk never loads: the nav's sign-in control stays an empty
 * placeholder (`components/auth/nav-auth-control.tsx` renders a blank span until `isLoaded`), but
 * the founder's chosen picture shows "Sign in". A plain `npx next dev -p 3111` loads the
 * machine's own development environment exactly as `npm run dev` does, so Clerk loads and
 * "Sign in" appears — which also proves the fresh browser is signed out, so no account name or
 * picture can ever appear in the image (T-fjm-07).
 *
 * The base address comes from `PREVIEW_BASE_URL` (default `http://localhost:3111`). It needs no
 * new dependency: the crop and the downscale both run by screenshotting a second Chromium page,
 * not by using `sharp` (present only as Next's own optional dependency).
 *
 * Quick 260930-fjm, Task 4 (the founder's revision, 2026-09-30): "the preview picture doesn't
 * need the nav bar and button icons. Just a tightly cropped shot of the board." After the same
 * clicks as before, the script now measures the union of every data-carrying mark on the drawing
 * (`PREVIEW_CROP_SELECTORS`) — the board outline, its drag handles, the three station read-outs
 * and the four named data chips — and screenshots only that, clipped, with a small margin
 * (`PREVIEW_CROP_MARGIN_PX`). It is then framed to match the app's own viewer panel (its real,
 * computed border colour and corner radius, read through `PREVIEW_PANEL_SELECTOR` rather than a
 * colour guessed once) and centred on a white 1200x630 page, per `PREVIEW_FRAME`.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import {
  PREVIEW_ALT_FILE,
  PREVIEW_CAPTURE,
  PREVIEW_CROP_MARGIN_PX,
  PREVIEW_CROP_SELECTORS,
  PREVIEW_FRAME,
  PREVIEW_HIDE_TOOLBAR_CSS,
  PREVIEW_IMAGE_ALT,
  PREVIEW_IMAGE_FILE,
  PREVIEW_IMAGE_SIZE,
  PREVIEW_PANEL_SELECTOR,
  pngDimensions,
  previewImageProblems,
} from "../lib/link-preview/preview-image";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASE_URL = process.env.PREVIEW_BASE_URL ?? "http://localhost:3111";

async function main(): Promise<void> {
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({
      viewport: PREVIEW_CAPTURE.viewport,
      deviceScaleFactor: PREVIEW_CAPTURE.deviceScaleFactor,
      colorScheme: "light",
    });
    const page = await context.newPage();

    // A fresh context means signed out, Imperial and the Daylight theme. This also dismisses the
    // sign-in banner and the toolbar tip, neither of which belongs in the founder's chosen frame.
    await page.addInitScript(
      ([bannerKey, tipKey]) => {
        sessionStorage.setItem(bannerKey, "true");
        localStorage.setItem(tipKey, "true");
      },
      [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY],
    );

    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 120_000 });

    const signInButton = page.getByRole("button", { name: "Sign in", exact: true });
    try {
      await signInButton.waitFor({ state: "visible", timeout: 60_000 });
    } catch {
      throw new Error(
        "Clerk never loaded on the dev server, so the nav would show a blank where Sign in " +
          "belongs. Start the dev server with `npx next dev -p 3111` (it loads the machine's own " +
          "development keys), not the test server.",
      );
    }

    await page
      .getByRole("button", { name: /Start Shaping/ })
      .filter({ hasText: PREVIEW_CAPTURE.presetName })
      .first()
      .click();
    await page.waitForTimeout(PREVIEW_CAPTURE.settleMs.afterPreset);

    await page.getByRole("link", { name: "TEMPLATE", exact: true }).filter({ visible: true }).first().click();
    await page.waitForURL(/\/design\/outline$/);
    await page.waitForTimeout(PREVIEW_CAPTURE.settleMs.afterTemplate);

    const [rotateButton, constructionButton, sidebarButton] = PREVIEW_CAPTURE.buttons;
    await page.getByRole("button", { name: rotateButton, exact: true }).click();
    await page.waitForTimeout(PREVIEW_CAPTURE.settleMs.afterButton);
    await page.getByRole("button", { name: constructionButton, exact: true }).click();
    await page.waitForTimeout(PREVIEW_CAPTURE.settleMs.afterButton);
    await page.getByRole("button", { name: sidebarButton, exact: true }).click();
    await page.waitForTimeout(PREVIEW_CAPTURE.settleMs.afterSidebar);

    await page.addStyleTag({ content: PREVIEW_CAPTURE.hideDevIndicatorCss });
    // Task 4: the viewer's own floating toolbar (Rotate, Construction Lines, Wide view, Export
    // Template) is pinned absolutely over the drawing's own top-right corner, so it can fall
    // inside the crop rectangle below even though it is never one of the elements that rectangle
    // is measured from. Hiding it outright is simpler and more robust than trying to carve its
    // corner out of the crop math.
    await page.addStyleTag({ content: PREVIEW_HIDE_TOOLBAR_CSS });
    await page.waitForTimeout(PREVIEW_CAPTURE.settleMs.afterStyle);

    // Measure the union of every data-carrying mark on the drawing — the board outline, its drag
    // handles, the three station read-outs and the four named data chips — in CSS px, so the crop
    // below keeps exactly those and nothing of the site nav (which sits well above this union).
    const crop = await page.evaluate(
      ({ selectors, margin }: { selectors: readonly string[]; margin: number }) => {
        const rects: DOMRect[] = [];
        for (const selector of selectors) {
          document.querySelectorAll(selector).forEach((el) => rects.push(el.getBoundingClientRect()));
        }
        if (rects.length === 0) {
          throw new Error(`No elements matched any of: ${selectors.join(", ")}`);
        }
        const left = Math.min(...rects.map((r) => r.left));
        const top = Math.min(...rects.map((r) => r.top));
        const right = Math.max(...rects.map((r) => r.right));
        const bottom = Math.max(...rects.map((r) => r.bottom));
        return {
          x: Math.max(0, left - margin),
          y: Math.max(0, top - margin),
          width: right - left + margin * 2,
          height: bottom - top + margin * 2,
        };
      },
      { selectors: PREVIEW_CROP_SELECTORS, margin: PREVIEW_CROP_MARGIN_PX },
    );

    // The viewer panel's own computed border colour and radius (Task 4), so the picture's frame
    // always matches the app's real chrome rather than a colour sampled once and left to drift.
    const panelFrame = await page.evaluate((selector: string) => {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`No element matched ${selector}`);
      const style = getComputedStyle(el);
      return {
        borderColor: style.borderTopColor,
        borderRadiusPx: parseFloat(style.borderTopLeftRadius) || 0,
      };
    }, PREVIEW_PANEL_SELECTOR);

    const cropped = await page.screenshot({ type: "png", clip: crop });
    const croppedDimensions = pngDimensions(new Uint8Array(cropped));
    const expectedCroppedWidth = Math.round(crop.width * PREVIEW_CAPTURE.deviceScaleFactor);
    const expectedCroppedHeight = Math.round(crop.height * PREVIEW_CAPTURE.deviceScaleFactor);
    if (
      !croppedDimensions ||
      Math.abs(croppedDimensions.width - expectedCroppedWidth) > 2 ||
      Math.abs(croppedDimensions.height - expectedCroppedHeight) > 2
    ) {
      throw new Error(
        `The cropped capture was ${croppedDimensions ? `${croppedDimensions.width} by ${croppedDimensions.height}` : "not a PNG"}, ` +
          `not close to the expected ${expectedCroppedWidth} by ${expectedCroppedHeight} (crop ${JSON.stringify(crop)}).`,
      );
    }

    await context.close();

    // Compose the final 1200x630 picture in a second Chromium page, with no new dependency
    // (P-8, unchanged by Task 4): a white page holding the cropped board, framed to match the
    // viewer panel, centred with at least PREVIEW_FRAME.minPaddingPx of white on every side.
    const composeContext = await browser.newContext({
      viewport: PREVIEW_IMAGE_SIZE,
      deviceScaleFactor: 1,
    });
    const composePage = await composeContext.newPage();
    const dataUrl = `data:image/png;base64,${cropped.toString("base64")}`;
    await composePage.setContent(
      `<!doctype html><html><head><style>
        html,body{margin:0;padding:0;overflow:hidden;background:#fff;width:${PREVIEW_IMAGE_SIZE.width}px;height:${PREVIEW_IMAGE_SIZE.height}px;}
        .frame{
          position:absolute;
          left:${PREVIEW_FRAME.insetPx}px;
          top:${PREVIEW_FRAME.insetPx}px;
          right:${PREVIEW_FRAME.insetPx}px;
          bottom:${PREVIEW_FRAME.insetPx}px;
          box-sizing:border-box;
          border:${PREVIEW_FRAME.borderWidthPx}px solid ${panelFrame.borderColor};
          border-radius:${panelFrame.borderRadiusPx}px;
          background:#fff;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:${PREVIEW_FRAME.minPaddingPx}px;
        }
        .frame img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;}
      </style></head><body><div class="frame"><img src="${dataUrl}" /></div></body></html>`,
    );
    await composePage.locator("img").evaluate((img: HTMLImageElement) => img.decode());
    const small = await composePage.screenshot({ type: "png" });
    await composeContext.close();

    const problems = previewImageProblems(new Uint8Array(small));
    if (problems.length > 0) {
      throw new Error(`The framed picture has problems: ${problems.join("; ")}`);
    }

    writeFileSync(join(REPO_ROOT, PREVIEW_IMAGE_FILE), small);
    writeFileSync(join(REPO_ROOT, PREVIEW_ALT_FILE), PREVIEW_IMAGE_ALT);

    console.log(
      `Wrote ${PREVIEW_IMAGE_FILE} (${PREVIEW_IMAGE_SIZE.width} x ${PREVIEW_IMAGE_SIZE.height}, ` +
        `${small.byteLength.toLocaleString("en-US")} bytes, frame ${panelFrame.borderColor} at ${panelFrame.borderRadiusPx}px radius) ` +
        `and ${PREVIEW_ALT_FILE}`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
