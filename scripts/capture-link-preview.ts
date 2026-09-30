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
 * new dependency: the downscale runs by screenshotting a second Chromium page, not by using
 * `sharp` (present only as Next's own optional dependency).
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
  PREVIEW_IMAGE_ALT,
  PREVIEW_IMAGE_FILE,
  PREVIEW_IMAGE_SIZE,
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
    await page.waitForTimeout(PREVIEW_CAPTURE.settleMs.afterStyle);

    const big = await page.screenshot({ type: "png" });
    const bigDimensions = pngDimensions(new Uint8Array(big));
    const expectedBigWidth = PREVIEW_CAPTURE.viewport.width * PREVIEW_CAPTURE.deviceScaleFactor;
    const expectedBigHeight = PREVIEW_CAPTURE.viewport.height * PREVIEW_CAPTURE.deviceScaleFactor;
    if (!bigDimensions || bigDimensions.width !== expectedBigWidth || bigDimensions.height !== expectedBigHeight) {
      throw new Error(
        `The full-viewport capture was ${bigDimensions ? `${bigDimensions.width} by ${bigDimensions.height}` : "not a PNG"}, ` +
          `not the expected ${expectedBigWidth} by ${expectedBigHeight}.`,
      );
    }

    await context.close();

    // Downscale in Chromium, with no new dependency (P-8): the 2x screenshot is loaded as a data
    // URL into an <img> sized exactly 1200x630 on a 1200x630, scale-1 page, which is then
    // screenshotted.
    const downscaleContext = await browser.newContext({
      viewport: PREVIEW_IMAGE_SIZE,
      deviceScaleFactor: 1,
    });
    const downscalePage = await downscaleContext.newPage();
    const dataUrl = `data:image/png;base64,${big.toString("base64")}`;
    await downscalePage.setContent(
      `<!doctype html><html><head><style>
        html,body{margin:0;padding:0;overflow:hidden;background:#fff;}
        img{display:block;width:${PREVIEW_IMAGE_SIZE.width}px;height:${PREVIEW_IMAGE_SIZE.height}px;}
      </style></head><body><img src="${dataUrl}" /></body></html>`,
    );
    await downscalePage.locator("img").evaluate((img: HTMLImageElement) => img.decode());
    const small = await downscalePage.screenshot({ type: "png" });
    await downscaleContext.close();

    const problems = previewImageProblems(new Uint8Array(small));
    if (problems.length > 0) {
      throw new Error(`The downscaled picture has problems: ${problems.join("; ")}`);
    }

    writeFileSync(join(REPO_ROOT, PREVIEW_IMAGE_FILE), small);
    writeFileSync(join(REPO_ROOT, PREVIEW_ALT_FILE), PREVIEW_IMAGE_ALT);

    console.log(
      `Wrote ${PREVIEW_IMAGE_FILE} (${PREVIEW_IMAGE_SIZE.width} x ${PREVIEW_IMAGE_SIZE.height}, ` +
        `${small.byteLength.toLocaleString("en-US")} bytes) and ${PREVIEW_ALT_FILE}`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
