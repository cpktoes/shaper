import { expect, test } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../../lib/models/toolbar-tip";
import { NOT_FOUND_COPY } from "../../lib/error-pages/copy";
import { FORCED_ERROR_ROUTE } from "../../lib/error-pages/forced-error";
import { SITE_DESCRIPTION } from "../../lib/site/metadata";
import { PREVIEW_IMAGE_ALT, PREVIEW_IMAGE_ROUTE, previewImageProblems } from "../../lib/link-preview/preview-image";

/**
 * Production-build proof (quick 260930-fjm, Phase 13 item 12, Task 3) that runs against a real
 * `next start`, never the dev server — the same reason `e2e/prod/slider-dots.spec.ts` exists.
 *
 * Two things only a production build can prove: `/test-error` is a plain not-found page there
 * (T-fjm-02 — the forced-error switch is dead without the dev-only env flag), and the built home
 * screen's picture address is the absolute live one (P-11) rather than the dev server's own
 * address.
 */

async function dismissPhoneBanners(page: import("@playwright/test").Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

test.describe("error pages and the link preview (production build)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissPhoneBanners(page);
  });

  test("the forced-error address is only a not-found page in a production build", async ({ page }) => {
    test.setTimeout(90_000);
    const response = await page.goto(FORCED_ERROR_ROUTE);
    expect(response?.status()).toBe(404);

    await expect(page.getByRole("heading", { name: NOT_FOUND_COPY.heading, level: 1 })).toBeVisible();
    expect(await page.locator("[data-error-screen]").count()).toBe(0);
  });

  test("the built home screen points the preview at the live address, and the picture loads", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto("/");

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute("content");
    const liveAddress = /^https:\/\/www\.shaperassistant\.com\/opengraph-image\.png\?/;
    expect(ogImage).toMatch(liveAddress);
    expect(twitterImage).toMatch(liveAddress);

    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", PREVIEW_IMAGE_ALT);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", SITE_DESCRIPTION);

    const response = await page.request.get(PREVIEW_IMAGE_ROUTE);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^image\/png/);
    const body = await response.body();
    expect(previewImageProblems(new Uint8Array(body))).toEqual([]);
  });
});
