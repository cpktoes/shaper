import { devices, expect, test, type Page } from "@playwright/test";

/**
 * 260909-hmn's own proof: on a short screen (a phone held sideways), the FINS tail plot should
 * fill nearly all of the viewer's height instead of sharing it with the legend stacked beneath.
 *
 * Measured at planning time against this checkout: `Pixel 7 landscape` (863 x 360) reads a
 * plot-to-viewer height ratio of 0.549 before this change and 1.000 after it. `iPhone 14
 * landscape` is deliberately NOT used here even though it is a real sideways phone — Playwright
 * emulates it at 750px wide, below the 820px `shell` breakpoint, so it renders the phone-stacked
 * shell rather than the desktop shell. That is a fine screen for the feature itself, but a poor
 * descriptor for THIS assertion: the two phones exercise two different shells, and one file
 * should not silently depend on which one a given phone happens to land on.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";

/** Matches e2e/phone-screens.spec.ts's own approach: dismiss the sign-in banner via
 * sessionStorage, set before navigation, so its own height never confuses a layout assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
}

test.describe("FINS with the phone held sideways", () => {
  // `defaultBrowserType` is a worker-scoped option Playwright only accepts from the config file's
  // own `projects` list, not from a describe-level `test.use` — the `android` project already
  // pins chromium, so it is dropped here and the rest of the device descriptor (viewport, touch,
  // scale factor) is applied on top of it.
  const pixel7Landscape = { ...devices["Pixel 7 landscape"] };
  delete (pixel7Landscape as { defaultBrowserType?: unknown }).defaultBrowserType;
  test.use({ ...pixel7Landscape });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "sideways-phone assertion runs on the chromium project only");
    await dismissSignInBanner(page);
  });

  test("the fin key moves beside the tail plot and the plot fills the short viewer's height", async ({ page }) => {
    await page.goto("/design/fins");

    // Prove the test is not vacuous: this really is a short screen before asserting anything
    // about its layout.
    const dims = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      short: window.matchMedia("(max-height: 500px)").matches,
    }));
    expect(dims.width).toBe(863);
    expect(dims.height).toBe(360);
    expect(dims.short).toBe(true);

    const plot = page.locator("main [data-fin-plot]");
    const legend = page.locator("main [data-fin-legend]");
    const viewer = plot.locator("xpath=..");
    await expect(plot).toBeVisible();
    await expect(legend).toBeVisible();

    const plotBox = await plot.boundingBox();
    const legendBox = await legend.boundingBox();
    const viewerBox = await viewer.boundingBox();
    if (!plotBox || !legendBox || !viewerBox) throw new Error("missing bounding box");

    // The legend sits to the right of the plot, not underneath it.
    expect(legendBox.x).toBeGreaterThanOrEqual(plotBox.x + plotBox.width - 1);

    // The plot fills the wrapper's height instead of sharing it with a stacked legend.
    expect(plotBox.height / viewerBox.height).toBeGreaterThanOrEqual(0.95);
  });
});

test.describe("FINS on a full-height screen", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "full-height assertion runs on the desktop project only");
    await dismissSignInBanner(page);
  });

  test("the fin key stays beneath the tail plot and the plot keeps sharing the viewer's height", async ({ page }) => {
    await page.goto("/design/fins");

    const short = await page.evaluate(() => window.matchMedia("(max-height: 500px)").matches);
    expect(short).toBe(false);

    const plot = page.locator("main [data-fin-plot]");
    const legend = page.locator("main [data-fin-legend]");
    const viewer = plot.locator("xpath=..");
    await expect(plot).toBeVisible();
    await expect(legend).toBeVisible();

    const plotBox = await plot.boundingBox();
    const legendBox = await legend.boundingBox();
    const viewerBox = await viewer.boundingBox();
    if (!plotBox || !legendBox || !viewerBox) throw new Error("missing bounding box");

    // The legend sits beneath the plot, not to its right.
    expect(legendBox.y).toBeGreaterThanOrEqual(plotBox.y + plotBox.height - 1);

    // The plot shares the viewer's height with the stacked legend, well under the short-screen
    // threshold.
    expect(plotBox.height / viewerBox.height).toBeLessThan(0.95);
  });
});
